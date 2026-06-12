-- k-anonymity floor for the popular-picks crowd aggregate.
--
-- With a small friends league (<4 predictors for a match), exposing even
-- anonymous aggregate counts breaks the anti-cheat promise arithmetically:
-- a player who knows their own pick can subtract it from the aggregate and,
-- with only 2 total predictors, read the other player's exact pre-kickoff
-- pick. With 3 players the subtraction still leaves only one other pick
-- unambiguous. At 4 predictors the remainder is ambiguous among ≥3 others,
-- so we use 4 as the minimum crowd size before showing any picks.
--
-- predictions PK is (user_id, match_id), so summing the per-scoreline
-- group counts across a match gives distinct predictors with no DISTINCT
-- keyword needed.
--
-- create or replace keeps the SECURITY DEFINER, revoke, and grant from
-- migration 0007 — privileges survive a function replacement, so no
-- grant statements are needed here.
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
    and predictors >= 4   -- k-anonymity floor; see comment above
  order by match_id, picks desc, home_pred, away_pred;
$$;
