# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

An unofficial FIFA World Cup 2026 prediction game. Players predict exact scores
for all 104 matches, compete on a shared leaderboard, and results sync
automatically from football-data.org.

## Commands

```bash
npm run dev          # Vite dev server
npm run build        # tsc -b (typecheck) + vite build → dist/
npm run typecheck    # tsc -b only
npm run lint         # eslint .
npm run seed         # load 104 fixtures into Supabase matches table (needs SUPABASE_* env)
npm run generate-schedule   # regenerate scripts/data/matches-2026.json
```

There is no test runner configured. After code changes, validate with
`npm run typecheck` and `npm run lint`.

To run the scheduled sync function locally: `netlify functions:invoke sync-results`.

Env vars live in `.env` (copy from `.env.example`). `VITE_*` are public/client;
`SUPABASE_SERVICE_ROLE_KEY` and `FOOTBALL_DATA_TOKEN` are server-only (functions + seed scripts).

## Architecture

Vite + React 19 SPA, Supabase (Postgres + Auth + RLS) backend, one Netlify
scheduled function. Path alias `@/` → `src/`. shadcn/ui (new-york style) in
`src/components/ui/`; Tailwind v4 configured CSS-first via `@theme` in `src/index.css`.

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

### Identity / usernames (`0001_init.sql`)
Signup is open to anyone. Each profile has a unique `username` (no first/last
name), chosen at signup and rendered as `@handle` everywhere.
- Format `^[a-z0-9_]{3,20}$` and a unique index are enforced at the DB layer
  (`username_format` check + `profiles_username_key`), not just in the form.
- `handle_new_user()` trusts the `username` passed in signup metadata; a
  duplicate/malformed value fails the insert so signup errors cleanly. The
  email-fallback path (no username supplied) sanitizes the local-part and
  auto-suffixes to stay valid and unique.
- `username_available(name)` is a `SECURITY DEFINER` RPC granted to `anon` so
  the (logged-out) signup form can pre-check availability, which RLS would
  otherwise hide. The client regex in `src/pages/Login.tsx` mirrors the SQL
  check and must be kept in sync with it.

### Data flow
- `src/hooks/queries.ts` — all data access via TanStack Query + the Supabase client (`src/lib/supabase.ts`). `useMatches`/`useLeaderboard` poll every 60s. Mutations (`useUpsertPrediction`, `useAdminUpdateMatch`) invalidate the relevant query keys.
- `netlify/functions/sync-results.mts` — runs every 10 min (cron `*/10 * * * *`), guarded to the tournament window. Fetches `competitions/WC/matches` from football-data.org v4 and upserts results. Links API matches to our rows by `fd_id`, falling back to `(stage + kickoff day)` for statically-seeded rows that lack an `fd_id`.
- `scripts/seed-matches.ts` — seeds fixtures from the committed `scripts/data/matches-2026.json` (offline) or live from the API (`SEED_SOURCE=api`). The committed JSON is illustrative; the sync function reconciles names/times/results against official data once a token is set.

### Routing (`src/App.tsx`)
`ProtectedRoute` gates all pages behind auth (`src/hooks/useAuth.tsx`); `AdminRoute`
gates `/admin`. Pages: Matches (index), Leaderboard, Standings, MyPredictions (`/me`), Admin, Login.

## Gotchas

- **Keep `src/lib/scoring.ts` and the SQL scoring functions in sync** when changing point values or rules — they are duplicated by design (DB authoritative, client for display).
- **`USERNAME_RE` in `src/pages/Login.tsx` mirrors the `username_format` SQL check** — keep them identical if you change the allowed username shape.
- `matches.id` is the official match number 1..104 (not a surrogate key); `fd_id` is the football-data.org id and is nullable until linked by the sync.
- Schema changes go in a Supabase migration under `supabase/migrations/`; remember RLS implications for any new table/column.
