-- Make the fixtures publicly viewable.
--
-- Matches and the group standings (computed client-side from matches) are now
-- shown to anonymous visitors; only predicting and the leaderboard require a
-- session. Since the database is the source of truth, anonymous reads must be
-- opened at the RLS layer or the public pages would render empty.
--
-- This only exposes the matches table (fixtures, kickoff times, live scores and
-- results). predictions and the leaderboard/scored_predictions views remain
-- authenticated-only — anon is deliberately not granted on them.

grant select on table public.matches to anon;

create policy "matches readable by anon" on public.matches
  for select to anon using (true);
