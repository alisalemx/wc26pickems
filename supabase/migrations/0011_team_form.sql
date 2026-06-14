-- 0011_team_form.sql
-- Pre-tournament "recent form" per national team, sourced from API-Football.
-- football-data.org's free tier carries no national-team matches outside the
-- World Cup itself (friendlies, qualifiers, Nations League are all absent), so
-- form comes from a second provider via the sync-form scheduled function.
--
-- Populated by the service role (which bypasses RLS). Publicly readable so the
-- form chips render for logged-out visitors too, exactly like the public
-- `matches` grant in 0004_public_matches.sql.

create table public.team_form (
  code text primary key,              -- football-data TLA; joins to matches.home_code / away_code
  name text,                          -- team name as reported by API-Football
  api_id int,                         -- API-Football team id (NOT football-data's id)
  form text,                          -- compact W/D/L string, oldest -> newest (e.g. 'WDLWW')
  results jsonb,                      -- per-match detail backing the form string
  updated_at timestamptz not null default now()
);

alter table public.team_form enable row level security;

-- Read-only for everyone. No insert/update/delete policies exist, so only the
-- service role can write — the same shape used for `matches`.
create policy "team_form readable by anyone"
  on public.team_form for select
  using (true);

grant select on public.team_form to anon, authenticated;
