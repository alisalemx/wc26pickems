# 🏆 World Cup 2026 Prediction League

A friends-league prediction game for the FIFA World Cup 2026. Predict the exact
score of all **104 matches** (72 group games + the full knockout bracket),
compete on a shared leaderboard, and watch results update automatically.

Built with **Vite + React + TypeScript**, **Tailwind CSS v4**, **shadcn/ui**,
**Supabase** (auth + Postgres + RLS), and a **Netlify scheduled function** that
pulls live results from [football-data.org](https://www.football-data.org).

## How it works

- **Predict** exact scores. Each match locks at kickoff — enforced in the
  database, not just the UI, so nobody can sneak a late pick.
- **Privacy until lock:** you can't see anyone else's prediction for a match
  until it kicks off (also enforced by Row Level Security).
- **Scoring** (computed live in SQL, never stored, so corrections are instant):
  - Exact score: **3 pts**
  - Correct outcome (W/D/L): **1 pt**
  - Knockout multipliers: R32 ×1, R16 ×2, QF ×2, SF ×3, 3rd place ×2, **Final ×4**
  - Knockouts are judged on the **90'+extra-time** score; penalty shootouts are
    shown but never affect points (so a draw is a valid knockout pick).
- **Results sync** every 10 minutes during the tournament; an **admin** page
  lets you enter or correct any result manually as a fallback.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Vite, React 19, TypeScript, React Router, TanStack Query |
| UI | Tailwind CSS v4 (CSS-first `@theme`), shadcn/ui, Lucide, Sonner |
| Backend | Supabase (Postgres, Auth, RLS) |
| Sync | Netlify Scheduled Function → football-data.org v4 API |
| Hosting | Netlify (static SPA + functions) |

## Setup

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   (SQL Editor, or `supabase db push`). This creates the tables, RLS policies,
   and scoring views.
3. **Auth → Providers → Email:** turn **off** "Confirm email" so friends can
   sign up and start predicting immediately.
4. Grab your **Project URL**, **anon key**, and **service role key**
   (Settings → API).

### 2. Environment variables
Copy `.env.example` to `.env` and fill in the client values for local dev:

```bash
cp .env.example .env
```

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
# From the committed static schedule (works offline):
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed

# Or fetch the official schedule live (real kickoff times + fd_ids — recommended):
SEED_SOURCE=api FOOTBALL_DATA_TOKEN=... SUPABASE_URL=... \
  SUPABASE_SERVICE_ROLE_KEY=... npm run seed
```

> The committed `scripts/data/matches-2026.json` is an illustrative seed so the
> app works out of the box. Team names, kickoff times, knockout participants,
> and results are all reconciled against official data by the sync function once
> a `FOOTBALL_DATA_TOKEN` is set — so running the live seed (or just letting the
> scheduled sync run) keeps everything accurate.

### 4. Make yourself admin
After signing up once, in the Supabase SQL editor:

```sql
update public.profiles set is_admin = true where id = '<your-auth-user-id>';
```

The **Admin** tab then appears for manual result entry.

### 5. Deploy to Netlify
1. Connect this repo; build settings come from [`netlify.toml`](netlify.toml)
   (`npm run build` → `dist`, SPA redirect, functions in `netlify/functions`).
2. Set all five environment variables in **Site settings → Environment variables**.
3. Deploy. The scheduled function (`sync-results`, every 10 min) runs only on
   the **published production** deploy. Test it manually with:
   ```bash
   netlify functions:invoke sync-results
   ```

## Local development

```bash
npm install
npm run dev          # Vite dev server
npm run build        # type-check + production build
npm run lint
npm run generate-schedule   # regenerate scripts/data/matches-2026.json
```

## Project structure

```
src/
  components/       MatchCard, badges, Layout (bottom-nav), ui/ (shadcn)
  hooks/            useAuth, React Query data hooks
  lib/              supabase client, scoring, flags, formatting, types
  pages/            Login, Matches, Leaderboard, MyPredictions, Standings, Admin
netlify/functions/  sync-results.mts (scheduled result fetcher)
scripts/            generate-schedule.ts, seed-matches.ts, teams.ts
supabase/migrations/0001_init.sql   schema + RLS + scoring views
```
