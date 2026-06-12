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

-- Replaces the per-match prediction_distribution(p_match_id) RPC: the match
-- list renders up to ~100 cards, and one RPC per card meant ~100 aggregate
-- queries per page view. This variant returns the top 3 scorelines for
-- every match that hasn't kicked off yet, in a single call.
create or replace function public.prediction_distributions()
returns table (match_id int, home_pred int, away_pred int, picks int)
language sql
security definer
set search_path = public
stable
as $$
  select match_id, home_pred, away_pred, picks
  from (
    select
      p.match_id,
      p.home_pred,
      p.away_pred,
      count(*)::int as picks,
      row_number() over (
        partition by p.match_id
        order by count(*) desc, p.home_pred, p.away_pred
      ) as rn
    from public.predictions p
    join public.matches m on m.id = p.match_id
    where m.kickoff > now()
    group by p.match_id, p.home_pred, p.away_pred
  ) ranked
  where rn <= 3
  order by match_id, picks desc, home_pred, away_pred;
$$;

revoke execute on function public.prediction_distributions() from public, anon;
grant execute on function public.prediction_distributions() to authenticated;

-- The per-match variant has no callers once the client ships; drop it so
-- there is one way to read the crowd aggregate.
drop function public.prediction_distribution(int);
