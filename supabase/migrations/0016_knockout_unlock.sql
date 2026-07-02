-- =========================================================================
-- Knockout unlock: fill a knockout match's team slots from its feeders'
-- WINNERS server-side, so the next round becomes predictable in our own
-- database rather than waiting (sometimes hours) for football-data to assign
-- the slot upstream. This mirrors the client's resolveKnockoutTeams derivation
-- (src/lib/bracket.ts) but makes the DATABASE authoritative: the prediction
-- lock lifts (RLS "insert own prediction before kickoff" requires both teams
-- non-null) the moment we fill the slot, so the client Save button can never
-- get ahead of what the DB will accept.
--
-- Two deliberate properties:
--  * The finished match's OWN result is untouched — it shows/scores instantly
--    via the normal sync. Only the *unlocking of the next match* is gated.
--  * We wait a settle window after a feeder goes final before propagating, so
--    a single glitchy "final" poll from ESPN can't unlock the wrong matchup.
-- =========================================================================

-- When a match first reached FINISHED. A stable marker for the settle window:
-- matches.updated_at is bumped on every sync write, so it can't gate a delay.
alter table public.matches add column if not exists finished_at timestamptz;

-- Backfill rows already finished before this migration to a time safely past
-- the settle window, so any still-empty downstream slot (a feeder that finished
-- long ago but was never assigned upstream) unlocks on the next sync.
update public.matches
  set finished_at = now() - interval '1 hour'
  where status = 'FINISHED' and finished_at is null;

-- Stamp finished_at on the transition into FINISHED; clear it if a row ever
-- regresses out of FINISHED (the sync's own anti-regression hold makes that
-- rare, but keep the marker honest). Untouched on a status-unchanged re-sync,
-- so the original finish time — and thus the settle window — stays fixed.
create or replace function public.stamp_finished_at()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'FINISHED' then new.finished_at := now(); end if;
  else
    if new.status = 'FINISHED' and old.status is distinct from 'FINISHED' then
      new.finished_at := now();
    elsif new.status is distinct from 'FINISHED' and old.status = 'FINISHED' then
      new.finished_at := null;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists stamp_finished_at on public.matches;
create trigger stamp_finished_at
  before insert or update on public.matches
  for each row execute function public.stamp_finished_at();

-- The team a decided match sends onward: its winner, or (for the third-place
-- play-off) its loser. Winner is judged on 90'+ET first and the shootout only
-- as the decider — the same rule as scoring/bracket.ts winnerSide. Returns no
-- row while the match is unfinished or level with no shootout.
create or replace function public.knockout_advancer(p_id int, p_which text)
returns table(team text, code text)
language sql stable as $$
  select
    case when s.side = 'home' then m.home_team else m.away_team end,
    case when s.side = 'home' then m.home_code else m.away_code end
  from public.matches m
  cross join lateral (
    select case
      when m.status <> 'FINISHED' or m.home_score is null or m.away_score is null
        then null
      when m.home_score > m.away_score then 'home'
      when m.away_score > m.home_score then 'away'
      when m.home_pens is not null and m.away_pens is not null
           and m.home_pens > m.away_pens then 'home'
      when m.home_pens is not null and m.away_pens is not null
           and m.away_pens > m.home_pens then 'away'
      else null
    end as winner
  ) w
  cross join lateral (
    select case
      when w.winner is null then null
      when p_which = 'winner' then w.winner
      when w.winner = 'home' then 'away'
      else 'home'
    end as side
  ) s
  where m.id = p_id and s.side is not null;
$$;

-- Fill every knockout slot whose two feeders have both been final for at least
-- the settle window, taking each side from the feeder in the corresponding
-- position. Only ever fills a NULL side (a real football-data assignment always
-- wins), so it's idempotent and never fights the upstream feed. Returns the
-- number of rows filled. Called each run by the sync (netlify sync-results).
--
-- The FEEDERS map here MIRRORS src/lib/bracket.ts FEEDERS/THIRD_FEEDERS (home
-- feeder, away feeder, target). Keep the two in sync if the bracket changes.
create or replace function public.fill_ready_knockout_slots()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  settle constant interval := interval '10 minutes';
  filled integer := 0;
begin
  with feeders(home_feeder, away_feeder, target, which) as (
    values
      (101, 102, 104, 'winner'),  -- Final
      (97,  98,  101, 'winner'),  -- Semi-finals
      (99,  100, 102, 'winner'),
      (89,  90,  97,  'winner'),  -- Quarter-finals
      (93,  94,  98,  'winner'),
      (91,  92,  99,  'winner'),
      (95,  96,  100, 'winner'),
      (74,  77,  89,  'winner'),  -- Round of 16
      (73,  75,  90,  'winner'),
      (76,  78,  91,  'winner'),
      (79,  80,  92,  'winner'),
      (83,  84,  93,  'winner'),
      (81,  82,  94,  'winner'),
      (86,  88,  95,  'winner'),
      (85,  87,  96,  'winner'),
      (101, 102, 103, 'loser')    -- Third-place play-off (SF losers)
  ),
  ready as (
    select f.target, f.home_feeder, f.away_feeder, f.which
    from feeders f
    join public.matches t  on t.id  = f.target
    join public.matches hf on hf.id = f.home_feeder
    join public.matches af on af.id = f.away_feeder
    where (t.home_team is null or t.away_team is null)
      and hf.status = 'FINISHED' and hf.finished_at is not null
        and hf.finished_at <= now() - settle
      and af.status = 'FINISHED' and af.finished_at is not null
        and af.finished_at <= now() - settle
  ),
  upd as (
    update public.matches t set
      home_team  = coalesce(t.home_team, ha.team),
      home_code  = coalesce(t.home_code, ha.code),
      away_team  = coalesce(t.away_team, aa.team),
      away_code  = coalesce(t.away_code, aa.code),
      updated_at = now()
    from ready r
    left join lateral public.knockout_advancer(r.home_feeder, r.which) ha on true
    left join lateral public.knockout_advancer(r.away_feeder, r.which) aa on true
    where t.id = r.target
      and ((t.home_team is null and ha.team is not null)
        or (t.away_team is null and aa.team is not null))
    returning 1
  )
  select count(*) into filled from upd;
  return filled;
end $$;

-- Writes matches, so keep it off the public/anon/authenticated surface — only
-- the service-role sync invokes it.
revoke all on function public.fill_ready_knockout_slots() from public;
revoke all on function public.knockout_advancer(int, text) from public;
grant execute on function public.fill_ready_knockout_slots() to service_role;
grant execute on function public.knockout_advancer(int, text) to service_role;
