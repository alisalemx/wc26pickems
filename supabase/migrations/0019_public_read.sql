-- 0019_public_read.sql
-- Make the whole app publicly readable, read-only.
--
-- The tournament is over and the site now doubles as a portfolio piece, so
-- logged-out visitors should see the leaderboard, player pages, revealed picks,
-- and the Hall of fame without a Google sign-in. Until now only the fixture
-- tables were open to anon (matches 0004, team_form 0011, standings 0013,
-- head_to_head 0017). Every handle was first replaced with a randomly
-- assigned footballer pun (scripts/sql/2026-anonymize-handles.sql), so opening
-- these doesn't reveal who played.
--
-- Both scoring views are security_invoker, so they read predictions and
-- profiles as anon: the view grants alone would return no rows. Each
-- underlying table needs an anon SELECT policy as well.
--
-- Writes stay locked. anon gets no insert/update/delete policy anywhere, and
-- its default write grants on these two tables are dropped too, so RLS isn't
-- the only gate. Pre-kickoff picks stay hidden by the same reveal rule
-- signed-in players get. prediction_distributions(), username_available(),
-- and set_username() are unchanged and stay authenticated-only.

-- =========================================================================
-- predictions: everyone's picks, once the match has kicked off
-- Mirrors "read predictions after lock" (0001) minus the own-picks branch,
-- which can't apply to anon.
-- =========================================================================
create policy "predictions readable by anon after kickoff" on public.predictions
  for select to anon
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and m.kickoff <= now()
    )
  );

revoke all on table public.predictions from anon;
grant select on table public.predictions to anon;

-- =========================================================================
-- profiles: id and username only
-- The leaderboard view and the revealed-picks embed (predictions ->
-- profiles(username)) need nothing more, and is_admin, created_at, and
-- username_chosen would help match a handle to a person. The column grant is
-- the gate here; the policy only lets the rows through. The authenticated
-- grants, including 0001's username-only UPDATE grant, are untouched.
-- =========================================================================
create policy "profiles readable by anon" on public.profiles
  for select to anon using (true);

-- Revoking at table level also drops anon's column privileges.
revoke all on table public.profiles from anon;
grant select (id, username) on table public.profiles to anon;

-- =========================================================================
-- Scoring views
-- 0018 revoked the default anon grants; give back SELECT only.
-- =========================================================================
grant select on public.scored_predictions to anon;
grant select on public.leaderboard to anon;
