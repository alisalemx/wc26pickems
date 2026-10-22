-- Security hardening (2026-10-22), from the second codebase security audit.
-- Tightens grants and the prediction lock; no scoring semantics change.

-- =========================================================================
-- 1. Lock predictions on match status as well as kickoff time
-- The lock compared now() to matches.kickoff alone, so a kickoff stored later
-- than the real one (football-data and ESPN have both mis-timed matches, e.g.
-- Mexico–Ecuador an hour off) left a live match open to new or changed picks
-- with the score already showing. Require the match to still be pre-match
-- (TIMED/SCHEDULED) too. A whitelist fails closed: any other status, including
-- one the feed introduces later, blocks the write.
-- The client mirrors this in isPredictionLocked (src/lib/format.ts).
-- =========================================================================
-- alter (not drop + create) keeps each policy's name, command, and roles.
alter policy "insert own prediction before kickoff" on public.predictions
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.kickoff > now()
        and m.status in ('TIMED', 'SCHEDULED')
        and m.home_team is not null
        and m.away_team is not null
    )
  );

alter policy "update own prediction before kickoff" on public.predictions
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.kickoff > now()
        and m.status in ('TIMED', 'SCHEDULED')
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.kickoff > now()
        and m.status in ('TIMED', 'SCHEDULED')
        and m.home_team is not null
        and m.away_team is not null
    )
  );

-- =========================================================================
-- 2. Close the EXECUTE grants Supabase adds by default
-- Supabase's default privileges grant EXECUTE on new public functions to anon
-- and authenticated explicitly, so 0016's bare `revoke ... from public` left
-- fill_ready_knockout_slots() (SECURITY DEFINER, writes matches) callable by
-- logged-out visitors through /rest/v1/rpc. Same gotcha 0014 fixed for
-- is_admin(). Revoke from both roles on every function that isn't a client RPC.
-- Trigger functions don't need EXECUTE to fire, so revoking is safe there.
-- =========================================================================
revoke execute on function public.fill_ready_knockout_slots() from public, anon, authenticated;
revoke execute on function public.knockout_advancer(int, text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.stamp_finished_at() from public, anon, authenticated;

-- set_username() is a client RPC, but only for signed-in users (it raises for
-- anon anyway); drop the anon grant so it isn't on the logged-out surface.
revoke execute on function public.set_username(text) from public, anon;
grant execute on function public.set_username(text) to authenticated;

-- 0004 says the scoring views are deliberately not granted to anon, but the
-- default privileges granted SELECT anyway. RLS made them return no rows;
-- revoke so the grant matches the documented intent.
revoke all on public.scored_predictions from anon;
revoke all on public.leaderboard from anon;

-- =========================================================================
-- 3. Pin search_path on the remaining functions (Supabase linter 0011)
-- None are SECURITY DEFINER, so this is hygiene. Their bodies reference no
-- unqualified objects, so an empty search_path is safe.
-- =========================================================================
alter function public.stage_multiplier(public.match_stage) set search_path = '';
alter function public.stamp_finished_at() set search_path = '';
alter function public.knockout_advancer(int, text) set search_path = '';

-- =========================================================================
-- 4. Stop deriving the fallback handle from the email address
-- handle_new_user() built the placeholder handle from the email local-part,
-- and every signed-in player could see it on the leaderboard until the new
-- player chose a handle at /welcome. Use a random `fan_xxxxxxxx` instead.
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  -- Random placeholder, left unchosen so the app prompts the user to pick a
  -- real handle on first sign-in. Loop on the (unlikely) collision.
  loop
    candidate := 'fan_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    exit when not exists (select 1 from public.profiles where username = candidate);
  end loop;

  insert into public.profiles (id, username, username_chosen)
  values (new.id, candidate, false);
  return new;
end;
$$;

-- create or replace keeps the revoke above, but restate it so this file reads
-- correctly on its own.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Replace the email-derived placeholder on any profile that never chose a
-- handle. These users haven't passed /welcome, so the handle was never theirs.
do $$
declare
  r record;
  candidate text;
begin
  for r in select id from public.profiles where not username_chosen loop
    loop
      candidate := 'fan_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
      exit when not exists (select 1 from public.profiles where username = candidate);
    end loop;
    update public.profiles set username = candidate where id = r.id;
  end loop;
end $$;
