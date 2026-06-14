# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

An unofficial prediction game for the 2026 World Soccer Tournament. Players predict exact scores
for all 104 matches, compete on a shared leaderboard, and results sync
automatically from football-data.org.

## Commands

```bash
npm run dev          # Vite dev server
npm run build        # tsc -b (typecheck) + vite build → dist/
npm run typecheck    # tsc -b only
npm run lint         # eslint .
npm test             # vitest run (unit tests for scoring + format helpers)
npm run seed         # load 104 fixtures into Supabase matches table (needs SUPABASE_* env)
npm run seed-team-form      # load static pre-tournament form into team_form (needs SUPABASE_* env)
npm run generate-schedule   # regenerate scripts/data/matches-2026.json
```

After code changes, validate with `npm run typecheck`, `npm run lint`, and
`npm test`. Test coverage is currently limited to the pure helpers
(`src/lib/scoring.test.ts`, `src/lib/format.test.ts`, `src/lib/form.test.ts`)
and the sync match-linker (`netlify/lib/link-matches.test.mts`).

To run the scheduled sync function locally: `netlify functions:invoke sync-results`.

Env vars live in `.env` (copy from `.env.example`). `VITE_*` are public/client;
`SUPABASE_SERVICE_ROLE_KEY` and `FOOTBALL_DATA_TOKEN` are server-only (functions + seed scripts).

## Architecture

Vite + React 19 SPA, Supabase (Postgres + Auth + RLS) backend, one Netlify
scheduled function. Path alias `@/` → `src/`. shadcn/ui (new-york style) in
`src/components/ui/`; Tailwind v4 configured CSS-first via `@theme` in `src/index.css`.

### Design system ("polished neo-brutalist")
Theme tokens live in `src/index.css` (`:root` light, `@media (prefers-color-scheme: dark)`
dark — no manual toggle). The look is small-radius cards with visible outlines and
offset shadows. Borders are **two-tier**: `--border` (`border-*` utilities) is a soft
hairline for table rows, separators, and inner boxes; `--ink` (`border-ink`) is the
strong structural outline reserved for cards, buttons, inputs, alerts, and dialogs.
Offset shadows use the translucent `--shadow-brutal`/`--shadow-brutal-sm` tokens.
Shared, restyle-once UI atoms live in `src/components/` (not `ui/`):
`TeamDisplay`, `StatCard`, `EmptyState`, `ListSkeleton`, `DayHeader`, `AuthShell` —
prefer these over re-inlining the pattern so a design change lands everywhere.

**The database is the source of truth for scoring and anti-cheat — not the
client.** This is the central design principle; the React app is a thin view layer.

### Scoring (computed live in SQL, never stored)
`supabase/migrations/0001_init.sql` defines:
- `stage_multiplier()` — point multipliers per stage (GROUP/R32 ×1, R16/QF/THIRD ×2, SF ×3, FINAL ×4).
- `scored_predictions` view — exact score = 3×mult, correct outcome (W/D/L) = 1×mult, else 0. Judged on `home_score`/`away_score` which hold the **90'+extra-time** result; penalty shootout columns (`home_pens`/`away_pens`) are display-only and never affect points.
- `leaderboard` view — aggregates `scored_predictions` per profile.

Because scoring is recomputed on read, admin corrections and result re-syncs
reflect on the leaderboard instantly. `src/lib/scoring.ts` is a **mirror of this
SQL for client-side display labels only** ("worth up to N pts") — its
`STAGE_MULTIPLIER` and `scorePrediction()` must be kept in sync with the SQL
functions, but never become the actual score.

### Anti-cheat via Row Level Security (`0001_init.sql`)
Enforced by Postgres `now()` vs `matches.kickoff`, never by the UI:
- Predictions can only be inserted/updated while `kickoff > now()` (locks at kickoff).
- You can read others' predictions for a match only after its kickoff (`read predictions after lock`); your own are always visible.
- `matches` updates restricted to admins (`is_admin()`); `profiles.is_admin` is protected by a column-level grant so users can't self-escalate.
- The sync function uses the service role key, which bypasses RLS.
- The `matches` table is **publicly readable** (`0004_public_matches.sql` grants
  `select` to `anon`) so fixtures and standings render for logged-out visitors.
  `predictions`, `scored_predictions`, and `leaderboard` are deliberately **not**
  granted to `anon` — predicting and the leaderboard still require a session.

### Popular picks (`0007`–`0010`)
The match list shows the crowd's most-predicted scorelines per upcoming match
(quick-pick chips in `MatchCard`). `prediction_distributions()` is a
`SECURITY DEFINER` RPC (authenticated only) that returns the top-3 scorelines
and pick counts for every match where `kickoff > now()`, in one call —
**anonymous aggregate counts only, never a user_id or username**, so the
"read predictions after lock" guarantee on *individual* picks holds. Each row
also carries `predictors`, the match's total predictor count (`0010`): chip
percentages divide by it, not by a sum of the returned rows, because the
result is truncated to the top 3. A k-anonymity floor (`predictors >= N`)
suppresses chips for matches with too few predictors; `0008` set it to 4,
`0009` lowered it to 2 for small friends leagues (accepting the
deanonymization-by-subtraction trade-off). The client reads it via
`usePredictionDistribution` (query key `["prediction-distributions"]`).

### Team form (`0011_team_form.sql`)
`MatchCard` shows each side's recent W/D/L form below the countries (upcoming
matches only), in **two halves separated by a vertical divider**:
- **Frozen pre-tournament (left, up to 5 pills)** — each team's last 5 matches
  *before* the World Cup kicked off (friendlies/qualifiers/Nations League). This
  is **static**: those matches are all in the past and never change, and no free
  API carries them (football-data.org's free tier has no out-of-tournament
  national-team matches; API-Football's free tier blocks current seasons). So the
  data was researched once and committed to `scripts/data/pre-tournament-form.json`,
  then loaded into the `team_form` table (publicly readable like `matches`,
  written only by the service role) via `npm run seed-team-form`
  (`scripts/seed-team-form.ts`). `form` string + `results` jsonb, keyed by
  football-data TLA `code`. Read client-side via `useTeamForm`
  (query key `["team-form"]`).
- **Live in-tournament (right, grows each matchday)** — the team's finished
  World Cup results so far, computed **client-side from our own `matches` table**
  (no API), via the pure `computeTournamentForm` (`src/lib/form.ts`) behind the
  `useTournamentForm` hook (derives from the shared `["matches"]` query).

There is **no scheduled sync** for form — the pre-tournament half is static
(re-run `seed-team-form` only to correct the committed JSON) and the
in-tournament half is derived live from `matches`.

### Admin result locks (`0006_result_lock.sql`)
`matches.result_locked` lets an admin's manual result survive the 10-min sync:
when set, the sync function skips the result fields (status/scores/pens/duration)
for that row but keeps reconciling fixture metadata (teams, kickoff, `fd_id`).
Unlocking re-opens the row to the API.

### Auth & identity / usernames (`0001_init.sql`, `0002_auth.sql`)
Sign-in is **Google OAuth only** (email/password was removed). OAuth needs a
Google client configured in the Supabase dashboard. The React flow lives in
`src/hooks/useAuth.tsx`: `signInWithGoogle` redirects to Google and back to `/`.

Signup is open to anyone. Each profile has a unique `username` (no first/last
name) rendered as `@handle` everywhere.
- Format `^[a-z0-9_]{3,20}$` and a unique index are enforced at the DB layer
  (`username_format` check + `profiles_username_key`), not just in the form.
- Google OAuth carries no username metadata, so `handle_new_user()` assigns an
  email-derived fallback handle with `username_chosen = false`, and
  `RequireUsername` holds the user at `/welcome` until they pick one. (The
  trigger still honors a `username` in signup metadata and sets
  `username_chosen = true` if present, but no current sign-in path supplies it.)
- `set_username(name)` is a `SECURITY DEFINER` RPC (granted to `authenticated`)
  that validates format + uniqueness, updates the caller's own handle, and flips
  `username_chosen` — the single path for choosing/changing a handle (avoids
  widening the column grant on `profiles`).
- `username_available(name)` is a `SECURITY DEFINER` RPC granted to
  `authenticated` (the `anon` grant was dropped in `0003` along with the signup
  form). Its only caller is the `/welcome` handle-picker. The client regex
  mirroring the SQL check now lives only in `src/pages/Welcome.tsx`.

### Data flow
- `src/hooks/queries.ts` — all data access via TanStack Query + the Supabase client (`src/lib/supabase.ts`). `useMatches`/`useLeaderboard` poll every 60s. Mutations (`useUpsertPrediction`, `useAdminUpdateMatch`) invalidate the relevant query keys.
- `netlify/functions/sync-results.mts` — runs every 10 min (cron `*/10 * * * *`), guarded to the tournament window. Fetches `competitions/WC/matches` from football-data.org v4 and upserts results. Links API matches to our rows via the unit-tested 4-pass linker in `netlify/lib/link-matches.mts` (explicit `fd_id` → exact kickoff instant → team codes → unique stage+day) — it links only when unambiguous, and unlinked matches are counted in the function's JSON response. Skips result fields for rows with `result_locked = true` (see admin result locks above).
- `scripts/seed-matches.ts` — seeds fixtures from the committed `scripts/data/matches-2026.json` (offline) or live from the API (`SEED_SOURCE=api`). The committed JSON is illustrative; the sync function reconciles names/times/results against official data once a token is set.
- `scripts/fd-shared.ts` — football-data.org fetch/mapping helpers shared between the sync function and the seed/schedule scripts; `scripts/teams.ts` holds the team metadata (names, flags) used by `generate-schedule.ts`.
- `scripts/seed-team-form.ts` — one-time loader of the static `scripts/data/pre-tournament-form.json` into `team_form` (see "Team form" above). No live sync.

### Routing (`src/App.tsx`)
The app shell is **public**: Matches (index) and Standings render for anonymous
visitors (backed by the public `matches` grant above). `RequireUsername` lets
anonymous visitors through but funnels a signed-in user to `/welcome` until they
pick a handle. `ProtectedRoute` (session required, `src/hooks/useAuth.tsx`) gates
Leaderboard, MyPredictions (`/me`), and Admin; `AdminRoute` further gates
`/admin`. `/welcome` needs a session but no handle; `/login` is open.
Pages: Matches (index), Leaderboard, Standings, MyPredictions (`/me`), Admin,
Login, Welcome (`/welcome`).

## Gotchas

- **Keep `src/lib/scoring.ts` and the SQL scoring functions in sync** when changing point values or rules — they are duplicated by design (DB authoritative, client for display).
- **Use `border-ink` (not plain `border`) for a card/control's structural outline.** Plain `border` resolves to the faint hairline `--border` token; the strong outline is the separate `--ink` token. The two are intentionally different (see the design-system note above).
- **The sticky `DayHeader` offset (`top-14`) tracks the `h-14` app header in `Layout.tsx`.** If you change the header height, update `DayHeader`'s `top-*` to match or the day strip will misalign.
- **`USERNAME_RE` in `src/pages/Welcome.tsx` mirrors the `username_format` SQL check** (in both `username_format` and `set_username`) — keep them identical if you change the allowed username shape.
- `matches.id` is the official match number 1..104 (not a surrogate key); `fd_id` is the football-data.org id and is nullable until linked by the sync.
- **`team_form.code` is the football-data TLA** and must match `matches.home_code`/`away_code` for the form chips to join. (`team_form.api_id` is vestigial — left nullable from the abandoned API path; the form data is static.)
- Schema changes go in a Supabase migration under `supabase/migrations/`; remember RLS implications for any new table/column.
