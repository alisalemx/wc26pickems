-- World Cup 2026 Prediction Game — initial schema, RLS, and scoring views.
-- Scoring is computed on the fly in SQL (never stored), so admin corrections
-- and result re-syncs are reflected on the leaderboard instantly.

-- =========================================================================
-- profiles
-- =========================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- =========================================================================
-- matches
-- =========================================================================
create type public.match_stage as enum (
  'GROUP', 'R32', 'R16', 'QF', 'SF', 'THIRD', 'FINAL'
);

create table public.matches (
  id int primary key,                 -- official match number 1..104
  fd_id bigint unique,                -- football-data.org match id (nullable until linked)
  stage public.match_stage not null,
  group_name text,                    -- 'A'..'L' for group stage
  matchday int,
  home_team text,                     -- null until knockout participants known
  away_team text,
  home_code text,                     -- three-letter code for flag display
  away_code text,
  kickoff timestamptz not null,
  venue text,
  status text not null default 'TIMED',
  home_score int,                     -- 90'+ET result (= API score.fullTime)
  away_score int,
  home_pens int,                      -- shootout, display only
  away_pens int,
  duration text not null default 'REGULAR',
  updated_at timestamptz not null default now()
);

create index matches_kickoff_idx on public.matches (kickoff);
create index matches_stage_idx on public.matches (stage);

-- =========================================================================
-- predictions
-- =========================================================================
create table public.predictions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id int not null references public.matches (id) on delete cascade,
  home_pred int not null check (home_pred between 0 and 20),
  away_pred int not null check (away_pred between 0 and 20),
  updated_at timestamptz not null default now(),
  primary key (user_id, match_id)
);

-- =========================================================================
-- scoring
-- =========================================================================
create or replace function public.stage_multiplier(s public.match_stage)
returns int
language sql
immutable
as $$
  select case s
    when 'GROUP' then 1
    when 'R32'   then 1
    when 'R16'   then 2
    when 'QF'    then 2
    when 'SF'    then 3
    when 'THIRD' then 2
    when 'FINAL' then 4
  end;
$$;

create view public.scored_predictions
with (security_invoker = true) as
select
  p.user_id,
  p.match_id,
  m.stage,
  m.kickoff,
  p.home_pred,
  p.away_pred,
  case
    when m.status <> 'FINISHED' or m.home_score is null then null
    when p.home_pred = m.home_score and p.away_pred = m.away_score
      then 3 * public.stage_multiplier(m.stage)
    when sign(p.home_pred - p.away_pred) = sign(m.home_score - m.away_score)
      then 1 * public.stage_multiplier(m.stage)
    else 0
  end as points,
  case
    when m.status <> 'FINISHED' or m.home_score is null then null
    when p.home_pred = m.home_score and p.away_pred = m.away_score then 'EXACT'
    when sign(p.home_pred - p.away_pred) = sign(m.home_score - m.away_score) then 'OUTCOME'
    else 'MISS'
  end as result_type
from public.predictions p
join public.matches m on m.id = p.match_id;

create view public.leaderboard
with (security_invoker = true) as
select
  pr.id as user_id,
  pr.display_name,
  coalesce(sum(sp.points), 0)::int as total_points,
  count(*) filter (where sp.result_type = 'EXACT')::int as exact_count,
  count(*) filter (where sp.result_type = 'OUTCOME')::int as outcome_count,
  count(*) filter (where sp.result_type is not null)::int as scored_count
from public.profiles pr
left join public.scored_predictions sp on sp.user_id = pr.id
group by pr.id, pr.display_name;

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;

-- profiles: everyone signed in can read; you can edit only your own row, and
-- only the display_name column (column grant below blocks is_admin escalation).
create policy "profiles readable" on public.profiles
  for select to authenticated using (true);

create policy "update own profile" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update on table public.profiles from authenticated;
grant update (display_name) on table public.profiles to authenticated;

-- matches: readable by all signed-in users; only admins may update (manual
-- result override). Automated sync runs as the service role and bypasses RLS.
create policy "matches readable" on public.matches
  for select to authenticated using (true);

create policy "admin result override" on public.matches
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- predictions: the heart of the anti-cheat design. Lock + visibility are
-- enforced by Postgres now() vs matches.kickoff, never by the client.
create policy "insert own prediction before kickoff" on public.predictions
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.kickoff > now()
        and m.home_team is not null
        and m.away_team is not null
    )
  );

create policy "update own prediction before kickoff" on public.predictions
  for update to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id and m.kickoff > now()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id and m.kickoff > now()
    )
  );

-- visibility: your own predictions always; everyone else's only after kickoff.
create policy "read predictions after lock" on public.predictions
  for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.matches m
      where m.id = match_id and m.kickoff <= now()
    )
  );

-- Allow authenticated users to read the scoring views (security_invoker means
-- the underlying RLS still applies, so only visible predictions are scored).
grant select on public.scored_predictions to authenticated;
grant select on public.leaderboard to authenticated;
