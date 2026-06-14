-- 0012_team_form_honors.sql
-- Adds the team's major senior honours (World Cup, continental championships,
-- Confederations Cup, Nations League) to team_form, for the team-info modal.
-- Static like the rest of team_form (researched + seeded, no live sync).
-- jsonb shape: [{ "competition": text, "count": int, "years": int[] }, ...]

alter table public.team_form
  add column honors jsonb;
