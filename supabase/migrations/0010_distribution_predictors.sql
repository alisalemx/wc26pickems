-- Return the per-match predictor count alongside the top-3 scorelines.
--
-- The 0007 batching truncated the result to the top 3 picks per match in SQL,
-- which silently changed the meaning of the chip percentages in the client:
-- it computed total = sum of the rows it received, so the denominator shrank
-- from "all predictors" to "predictors of the top 3 picks" and percentages
-- inflated. The function already computes the true per-match predictor count
-- for the 0008/0009 k-anonymity floor — expose it so the client can divide by
-- the real total. Still anonymous aggregate counts only, never a user_id.
--
-- drop + recreate (not create or replace) because the return type changes;
-- privileges are discarded with the drop, so the 0007 revoke/grant is
-- re-stated below.
drop function public.prediction_distributions();

create function public.prediction_distributions()
returns table (match_id int, home_pred int, away_pred int, picks int, predictors int)
language sql
security definer
set search_path = public
stable
as $$
  select match_id, home_pred, away_pred, picks, predictors::int
  from (
    select
      p.match_id,
      p.home_pred,
      p.away_pred,
      count(*)::int as picks,
      row_number() over (
        partition by p.match_id
        order by count(*) desc, p.home_pred, p.away_pred
      ) as rn,
      -- predictions PK is (user_id, match_id), so summing the group counts
      -- per match counts distinct predictors.
      sum(count(*)) over (partition by p.match_id) as predictors
    from public.predictions p
    join public.matches m on m.id = p.match_id
    where m.kickoff > now()
    group by p.match_id, p.home_pred, p.away_pred
  ) ranked
  where rn <= 3
    and predictors >= 2   -- k-anonymity floor, unchanged from 0009
  order by match_id, picks desc, home_pred, away_pred;
$$;

revoke execute on function public.prediction_distributions() from public, anon;
grant execute on function public.prediction_distributions() to authenticated;
