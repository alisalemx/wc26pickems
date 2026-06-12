-- Lower the popular-picks k-anonymity floor from 4 to 2 predictors.
--
-- Migration 0008 set a >= 4 floor, but in a small friends league (6 players)
-- that hid the "Popular picks" chips on nearly every match (only 1 of 13
-- upcoming matches cleared the bar). A >= 2 floor restores the feature on
-- most matches while still eliminating the worst leak: a match predicted by
-- exactly ONE person, where the single aggregate chip *is* that person's
-- exact pre-kickoff pick. With 2+ predictors the count no longer maps to a
-- single identifiable pick. (The deanonymization-by-subtraction concern from
-- 0008 is an accepted trade-off here for a casual friends league.)
--
-- create or replace keeps the SECURITY DEFINER, revoke, and grant from
-- migrations 0007/0008 — privileges survive a function replacement.
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
    and predictors >= 2   -- k-anonymity floor; see comment above
  order by match_id, picks desc, home_pred, away_pred;
$$;
