-- Audit hardening (2026-06-21): performance, integrity, and RLS tightening
-- surfaced by the codebase audit. None of these change the scoring or
-- anti-cheat semantics — they reinforce them.

-- =========================================================================
-- M1. Index predictions(match_id)
-- The table's only index is the composite PK (user_id, match_id), which can't
-- serve lookups by match_id alone. prediction_distributions() (polled every
-- 60s by every client) and the scored_predictions / leaderboard join all key
-- on match_id, so add the secondary index.
-- =========================================================================
create index if not exists predictions_match_id_idx
  on public.predictions (match_id);

-- =========================================================================
-- M2. Range checks on the matches result columns
-- Predictions are constrained to 0..20, but match results had no bounds, so a
-- sync bug or an admin typo could write an absurd score that flows straight
-- into scoring. Bound scores and shootout tallies to a sane 0..99 (wider than
-- predictions so a genuine blowout still records, and so a real result can sit
-- outside the predictable range). NULL stays allowed — a CHECK passes on NULL.
-- Deliberately no status/duration whitelist: football-data can introduce a new
-- status or duration string, and a too-strict CHECK would make the live sync
-- fail rather than just mislabel.
-- =========================================================================
alter table public.matches
  add constraint matches_home_score_range check (home_score between 0 and 99),
  add constraint matches_away_score_range check (away_score between 0 and 99),
  add constraint matches_home_pens_range  check (home_pens  between 0 and 99),
  add constraint matches_away_pens_range  check (away_pens  between 0 and 99);

-- =========================================================================
-- L2. Lock down EXECUTE on is_admin()
-- Every other function in the schema grants EXECUTE explicitly; is_admin() was
-- left on the default PUBLIC grant — and Supabase also adds an explicit `anon`
-- grant, so a bare `revoke from public` isn't enough (same gotcha as the
-- prediction-distribution RPCs). Revoke both; its only caller is the
-- matches-update RLS policy, evaluated as the authenticated user.
-- =========================================================================
revoke execute on function public.is_admin() from public;
revoke execute on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

-- =========================================================================
-- L3. Mirror the insert policy's team-not-null guard on the update policy
-- The insert policy requires the match to have both teams set; the update
-- policy dropped that check. Recreate it so a prediction can't be parked on a
-- match whose participants aren't known yet through either path.
-- =========================================================================
drop policy "update own prediction before kickoff" on public.predictions;
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
      where m.id = match_id
        and m.kickoff > now()
        and m.home_team is not null
        and m.away_team is not null
    )
  );

-- =========================================================================
-- H4. Stop trusting client-supplied username metadata in handle_new_user
-- The trigger honored new.raw_user_meta_data->>'username' and set
-- username_chosen = true directly. Sign-in is Google-only now (OAuth carries no
-- username metadata), so that branch is unreachable in the supported flow — but
-- it remains a latent self-provisioning path if email/password is ever
-- re-enabled at the auth provider (a client could call signUp with a username
-- in metadata and skip /welcome). Drop it: every new profile gets the
-- email-derived fallback handle, unchosen, so RequireUsername always prompts
-- for a deliberately chosen handle.
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  suffix int := 0;
begin
  -- Derive a valid, guaranteed-unique handle from the email local-part. Left
  -- unchosen so the app prompts the user to pick a real handle on first sign-in.
  base := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '_', 'g'));
  base := substr(base, 1, 20);
  if length(base) < 3 then
    base := base || 'fan';
  end if;

  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := substr(base, 1, 16) || suffix::text;
  end loop;

  insert into public.profiles (id, username, username_chosen)
  values (new.id, candidate, false);
  return new;
end;
$$;
