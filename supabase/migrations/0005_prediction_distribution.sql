-- "Popular picks": let players see the crowd's most-predicted scorelines for a
-- match *before* kickoff and quick-pick one of them.
--
-- This is a deliberate, narrow relaxation of the anti-cheat model. The
-- "read predictions after lock" RLS policy still hides every *individual*
-- prediction (the home/away pick tied to a user_id) until kickoff. This RPC is
-- SECURITY DEFINER so it can read across the predictions table, but it only
-- ever returns ANONYMOUS AGGREGATE COUNTS — scoreline + how many players chose
-- it, never a user_id or username. So "what did the crowd pick" becomes part of
-- the game while "what did *this player* pick" stays locked until kickoff.
--
-- Granted to authenticated only (anon is deliberately excluded, matching
-- predictions/leaderboard). The only caller is the prediction quick-pick UI.
create or replace function public.prediction_distribution(p_match_id int)
returns table (home_pred int, away_pred int, picks int)
language sql
security definer
set search_path = public
stable
as $$
  select home_pred, away_pred, count(*)::int as picks
  from public.predictions
  where match_id = p_match_id
  group by home_pred, away_pred
  order by count(*) desc, home_pred, away_pred;
$$;

-- Supabase's default privileges grant EXECUTE to anon/authenticated on new
-- public functions; revoke from anon so the crowd aggregate stays
-- authenticated-only, consistent with predictions and the leaderboard, which
-- anon cannot read.
revoke execute on function public.prediction_distribution(int) from public, anon;
grant execute on function public.prediction_distribution(int) to authenticated;
