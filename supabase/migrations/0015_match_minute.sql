-- Live match clock for in-progress matches.
--
-- Holds ESPN's formatted minute string for a match that's underway, e.g. "67'",
-- "45'+2'", or "HT" — the same source the knockout results come from (see
-- netlify/lib/espn.mts). The match list shows it beside the pulsing LIVE dot so
-- the elapsed clock is the real broadcast minute, not a wall-clock estimate from
-- kickoff (which drifts by the ~15-min halftime).
--
-- Display-only: scoring/form/standings never read it (they judge on
-- home_score/away_score). Null whenever the match isn't actively being clocked
-- — pre-match, full time, or simply not observed yet — in which case the client
-- falls back to its own wall-clock estimate.
--
-- Written by the sync function (service role, bypasses RLS) for knockout rows
-- inside their live window; matches is already publicly readable, so the new
-- column is covered by the existing select grant with no RLS change.
alter table public.matches
  add column if not exists minute text;
