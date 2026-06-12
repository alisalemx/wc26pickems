# 🏆 2026 World Soccer Tournament Prediction League

A friends-league prediction game for the 2026 World Soccer Tournament. Predict the exact
score of all **104 matches**, compete on a shared leaderboard, and watch results
sync in automatically from [football-data.org](https://www.football-data.org).

Built with **Vite + React 19 + TypeScript**, **Tailwind CSS v4**, **shadcn/ui**,
**Supabase** (Google auth + Postgres + RLS), and one **Netlify scheduled
function** for result syncing.

## How it works

- **Predict** exact scores. Each match locks at kickoff — enforced in the
  database, not just the UI, so nobody can sneak a late pick.
- **Privacy until lock:** you can't see another player's pick for a match until
  it kicks off. (You *can* see the crowd's most-popular scorelines as anonymous
  aggregate counts — never tied to a name.)
- **Scoring** (computed live in SQL, never stored, so corrections are instant):
  exact score **3 pts**, correct outcome (W/D/L) **1 pt**, multiplied by stage
  (R16/QF/3rd ×2, SF ×3, Final ×4). Knockouts are judged on the
  **90'+extra-time** score; penalty shootouts are shown but never scored.
- **Results sync** every 10 minutes during the tournament. An **admin** page can
  enter or correct any result manually; locked results survive the next sync.

## Quick start

```bash
npm install
cp .env.example .env   # fill in the values below
npm run dev
```

Validate changes with `npm run typecheck`, `npm run lint`, and `npm test`.

## Setup

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com) and run the SQL in
   [`supabase/migrations/`](supabase/migrations/) in order (SQL Editor or
   `supabase db push`). This creates the tables, RLS policies, and scoring views.
2. **Auth → Providers → Google:** enable it and add your Google OAuth client —
   sign-in is Google-only.
3. Grab your **Project URL**, **anon key**, and **service role key**
   (Settings → API) for the env vars below.

### 2. Environment variables

| Variable | Where | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | client + build | public |
| `VITE_SUPABASE_ANON_KEY` | client + build | public |
| `SUPABASE_URL` | functions + seed | server only |
| `SUPABASE_SERVICE_ROLE_KEY` | functions + seed | **secret** |
| `FOOTBALL_DATA_TOKEN` | functions + seed | free token from football-data.org |

### 3. Seed the schedule
Loads all 104 fixtures into the `matches` table.

```bash
npm run seed                 # from the committed static schedule (offline)
SEED_SOURCE=api npm run seed  # or fetch the official schedule live (recommended)
```

The committed `scripts/data/matches-2026.json` is an illustrative seed. Team
names, kickoff times, knockout participants, and results are all reconciled
against official data by the sync function once `FOOTBALL_DATA_TOKEN` is set.

### 4. Make yourself admin
After signing in once, in the Supabase SQL editor:

```sql
update public.profiles set is_admin = true where id = '<your-auth-user-id>';
```

The **Admin** tab then appears for manual result entry.

### 5. Deploy to Netlify
Connect the repo (build settings come from [`netlify.toml`](netlify.toml)), set
all five environment variables, and deploy. The scheduled `sync-results`
function (every 10 min) runs only on the published production deploy; test it
with `netlify functions:invoke sync-results`.

## Project structure

```
src/
  components/       MatchCard, Layout, shared atoms, ui/ (shadcn)
  hooks/            useAuth, TanStack Query data hooks
  lib/              supabase client, scoring, formatting, types (+ unit tests)
  pages/            Login, Welcome, Matches, Leaderboard, Standings, MyPredictions, Admin
netlify/functions/  sync-results.mts (scheduled result fetcher)
netlify/lib/        link-matches.mts (API↔fixture match linker + unit tests)
scripts/            generate-schedule.ts, seed-matches.ts, fd-shared.ts, teams.ts
supabase/migrations/  schema + RLS + scoring views
```

> Architecture details (scoring model, RLS anti-cheat, auth flow) live in
> [`CLAUDE.md`](CLAUDE.md).
