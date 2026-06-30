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
`SYNC_SECRET` (server-only, optional) authorizes manual HTTP force-syncs of the
sync function; the Netlify cron runs without it (see "Sync auth gate").

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

**Pressed states are a uniform convention: every interactive element settles on a
subtle background tint while held (`:active`) — no scale or translate — and the
tint matches the element rather than being a blanket green.** Three tiers:
- **Filled colour buttons** deepen their own fill: `default` →
  `active:bg-primary/80`, `destructive` → `active:bg-destructive/80`.
- **Accent buttons** (`outline`/`secondary`/`ghost`, whose hover is the green
  `--accent`) deepen to `--accent-pressed` (the `bg-accent-pressed` utility — one
  step past `--accent`, darker in light / lighter in dark so press reads distinct
  from hover).
- **Neutral chrome** (tabs, segmented control, nav items, the dialog close, text
  links, clickable table rows) presses to the adaptive `active:bg-foreground/10` —
  a hueless ink tint that darkens on light and lightens on dark, so it can never
  read as an out-of-place green.

The **`Switch`** is the one outlier: it darkens via `active:brightness-95` so the
press doesn't paint over its on/off state colour. Tinted text links pad the
highlight with `rounded-sm -mx-1 px-1` so it doesn't hug the glyphs. All are CSS
`transition`s, so the global `prefers-reduced-motion` backstop neutralizes their
timing automatically (no per-element gating needed).

Shared, restyle-once UI atoms live in `src/components/` (not `ui/`):
`TeamDisplay`, `StatCard`, `EmptyState`, `ListSkeleton`, `DayHeader`, `AuthShell`,
`SegmentedControl`, `StageBadge` — prefer these over re-inlining the pattern so a
design change lands everywhere. Type is Space Grotesk
(`@fontsource-variable/space-grotesk`, `--font-sans`); headings get a slight
negative letter-spacing (`@layer base`).

`StageBadge` renders a match's stage as **one flat `secondary` tag for every
round** (with the `×N` multiplier appended for knockout stages); the **Final
alone** is set apart, via the `.stage-final` treatment in `src/index.css` — a
deep gold gradient with light, embossed text (the inverse of the flat pale-gold
+ dark-text `gold` badge, so it never reads as the same chip), plus a slow gold
sheen sweep (the `final-sheen` keyframe). Note `.stage-final` uses
`background-origin: border-box` so the no-repeat gradient covers the badge's 1px
border ring — without it the `gold` variant's flat `bg-gold` shows through as a
pale rim. If you reintroduce a per-stage colour distinction, keep the Final the
only special one.

**The database is the source of truth for scoring and anti-cheat — not the
client.** This is the central design principle; the React app is a thin view layer.

### Motion & animation
Invoke the **`/web-animation-design` skill** before adding or changing any
animation, and follow its guidance rather than reaching for ad-hoc
durations/easings.

Two layers, both honoring `prefers-reduced-motion`:
- **CSS / `tw-animate-css`** (`animate-in fade-in-0 slide-in-from-bottom-*`,
  `zoom-in-95`, etc.) for entrances, exits, and the dialog/tabs transitions —
  the default for one-shot reveals.
- **`motion`** (Framer Motion's successor, imported from `motion/react`) for
  JS-driven *shared-layout* animation — the sliding `layoutId` pill in
  `SegmentedControl`, animated tab/route content, and the leaderboard. These
  bypass the CSS reduced-motion backstop, so each such component must gate its
  own motion with `useReducedMotion()`.

Tokens (do not hardcode timings — use these):
- **Durations** live in `:root` as plain custom properties (so they're never
  tree-shaken) and are consumed via `duration-[var(--duration-*)]`:
  `--duration-fast` 130ms (micro: chip press, badge pop), `--duration-base` 240ms
  (entrances, collapse), `--duration-slow` 280ms (modals/drawers), `--duration-exit`
  160ms. Keep UI motion under ~300ms and make exits ~20% faster than entrances.
- **Easings** live in `@theme` (so Tailwind generates `ease-*` utilities from the
  `--ease-*` namespace): `ease-out-cubic` (general), `ease-out-quint` (livelier
  card entrance), `ease-in-out-quart` (collapse / on-screen morph). Hover and
  color transitions stay on plain `ease`.

Bespoke keyframes (all in `src/index.css`, each scoped to a single element class):
`play-flow` (the "Ultramode" flowing-gradient sign-in CTA, `.play-cta`),
`countdown-pulse` (clock icon in the final minutes before kickoff),
`rank-pop` + `rank-sheen` with the `rank-metal-*` gradients (the viewer's own
rank reveal on `/me` — a scale-in with overshoot plus a slow medal-sheen sweep),
and `final-sheen` (a slow gold-sheen sweep over the Final stage tag, `.stage-final`).
Infinite/constant motion is used sparingly and only on one element at a time by
design. List entrances stagger via the `.stagger-in` utility: the caller sets the
row index inline as `--i`, and the cascade is capped (≤6 steps × 45ms) so long
lists don't lag. `backwards` fill-mode holds the start frame during the delay to
avoid a visible-then-snap flicker.

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

The Leaderboard's `ScoringGuide` modal (the green **"Scoring system"** link,
`src/components/ScoringGuide.tsx`) explains the rules to players — a per-match
legend, the stage-multiplier table, and a penalty-shootout worked example
(Brazil 1–1 Argentina, decided on penalties) showing how only the 90'+ET score
counts. All point values derive from the `scoring.ts` constants, so it tracks
any change there automatically.

### Anti-cheat via Row Level Security (`0001_init.sql`)
Enforced by Postgres `now()` vs `matches.kickoff`, never by the UI:
- Predictions can only be inserted/updated while `kickoff > now()` (locks at kickoff).
- You can read others' predictions for a match only after its kickoff (`read predictions after lock`); your own are always visible.
- `matches` updates restricted to admins (`is_admin()`); `profiles.is_admin` is protected by a column-level grant so users can't self-escalate.
- The sync function uses the service role key, which bypasses RLS — so its
  public HTTP endpoint is locked down separately (see "Sync auth gate" below).
- The `matches` table is **publicly readable** (`0004_public_matches.sql` grants
  `select` to `anon`) so fixtures and standings render for logged-out visitors.
  `predictions`, `scored_predictions`, and `leaderboard` are deliberately **not**
  granted to `anon` — predicting and the leaderboard still require a session.

### Sync auth gate (`netlify/lib/sync-auth.mts`)
The sync function is publicly reachable over HTTP at
`/.netlify/functions/sync-results` (Netlify serves scheduled functions at their
URL despite the docs' claim otherwise — a bare `GET` used to run it), and it
holds the service role key, so it must not be open to anyone. `isSyncAuthorized`
(a pure, unit-tested helper) gates the handler **before any env read, DB query,
or upstream fetch**: a caller is allowed only if it's **Netlify's scheduler**
— recognized by the `next_run` timestamp Netlify puts in the JSON body of every
scheduled invocation — **or** it presents the shared `SYNC_SECRET` as a bearer
token (`Authorization: Bearer …`, or the `X-Sync-Key` header, constant-time
compared). Everything else gets `401`. The scheduler path needs no secret, so
the 2-min cron keeps running even before `SYNC_SECRET` is configured (and never
breaks if it's rotated/removed); the manual force-sync now **requires** the
bearer token. Caveat: the repo is public, so the `next_run` shape is
discoverable and a crafted POST can still reach the body — but that's bounded by
the 60s cooldown (can't exceed the football-data quota or alter results) so the
residual is cost amplification, not a data risk. To close it fully, move
scheduling to a secret-carrying trigger (GitHub Actions / Supabase pg_cron) and
drop the `next_run` branch so every caller must hold the secret.

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

Chips render for **group-stage matches only** — knockout cards (`match.stage !==
"GROUP"`) show a muted "Popular picks are hidden in the knockout stage" note in
their place (gated in `MatchCard`, not the RPC, which still returns knockout
rows).

### Team form (`0011_team_form.sql`, `0012_team_form_honors.sql`)
`MatchCard` shows each side's recent W/D/L form (`TeamForm`) below the countries
(upcoming matches only) as **one rolling 5-match window** (`MAX_PILLS = 5`),
oldest → newest: in-tournament results fill from the right, and whatever slots
remain show the most recent pre-tournament pills. A **vertical divider** marks
the pre→tournament boundary when both are present; once a team has played 5+
World Cup games no pre-tournament pills are left. Pills are soft tints (pale
green win, neutral draw, pale red loss) with a near-ink letter. The two sources:
- **Frozen pre-tournament (static)** — each team's last 5 matches *before* the
  World Cup kicked off (friendlies/qualifiers/Nations League). These are all in
  the past and never change, and no free API carries them (football-data.org's
  free tier has no out-of-tournament national-team matches; API-Football's free
  tier blocks current seasons). So the data was researched once and committed to
  `scripts/data/pre-tournament-form.json`, then loaded into the `team_form` table
  (publicly readable like `matches`, written only by the service role) via
  `npm run seed-team-form` (`scripts/seed-team-form.ts`). `form` string +
  `results` jsonb, keyed by football-data TLA `code`. Read client-side via
  `useTeamForm` (query key `["team-form"]`).
- **Live in-tournament (grows each matchday)** — the team's finished World Cup
  results so far, computed **client-side from our own `matches` table** (no API),
  via the pure `computeTournamentForm` (`src/lib/form.ts`) behind the
  `useTournamentForm` hook (derives from the shared `["matches"]` query).

Two info dialogs (both in `TeamInfoDialog.tsx`, both rendering the same
`TeamPanel`) open from:
- a **"Compare" button** between the two form rows in `MatchCard` (shown once
  both teams are known) → `TeamInfoDialog`, a **two-team side-by-side** modal.
- an **info icon** on each group-standings row → `TeamDetailDialog`, the
  **single-team** variant.

Each panel has three sections, newest first: **This tournament** (detailed, via
`computeTournamentResults` / `useTournamentResults` from `matches`), **Last 5
(pre-tournament)** (from `team_form.results`), and **Honours** — major senior
trophies won (World Cup, continental championship, Confederations Cup, Nations
League), stored static in `team_form.honors` (`0012`) from
`scripts/data/honors.json` (separate file, merged by `seed-team-form`; counts +
years per competition).

There is **no scheduled sync** for form/honours — the pre-tournament pills and
honours are static (re-run `seed-team-form` only to correct the committed JSON
files) and the in-tournament half is derived live from `matches`. The form
pill (`FormPill`) is exported from `TeamForm` and reused in both dialogs.

### Group standings & best thirds (`0013_standings.sql`, `src/lib/standings.ts`)
The Tournament page's Groups tab renders **football-data's official group order**.
We can't reproduce FIFA's full ranking from match results alone: once teams are
level on points / goal difference / goals / head-to-head, FIFA breaks ties on
**fair-play (disciplinary) points** then a **drawing of lots** — and we store no
card data. football-data's `/competitions/WC/standings` endpoint already applies
that whole chain, so the sync function (which also fetches it) upserts each team's
`position` + stats into the public, service-role-written `standings` table
(mirrors `matches`/`team_form`), read client-side via `useStandings`
(`["standings"]`, polled 60s). Two football-data quirks the data handles: its
standings count **in-progress matches** (a live result shows before the matches
feed flips to FINISHED), and it serves a few teams under an **inconsistent TLA** —
Uruguay comes back as `URU` or `URY` depending on both the feed and the individual
response (the free tier flip-flops it every couple of minutes). The sync pins
every code it stores to one canonical TLA (`URU`) via `canonicalTla` (see "Data
flow"), so `matches`/`standings`/`team_form` always agree; the rows also key on
the stable `fd_team_id`, and both codes map in `flags.ts`.

The Groups tab does **not** render football-data's `position` order verbatim —
that lags, because the `/standings` endpoint updates on a different cadence than
the `/matches` feed, so the table could disagree with the live score shown on the
match list (e.g. a side sitting a place too low through a live draw). Instead the
table is **computed from our own `matches` feed** via `computeGroup`, so it always
agrees with the rest of the app and moves "as it happens"; football-data's
`position` is consulted **only as the final tiebreaker** for teams our own
criteria leave genuinely level (the fair-play / drawing-of-lots step we can't
derive), passed into `computeGroup` as an optional `PositionLookup`.

`src/lib/standings.ts` (`computeGroup`, unit-tested in `standings.test.ts`)
implements the FIFA criteria we *can* compute — points → GD → goals →
**head-to-head** (a recursive mini-table among only the tied teams) → football-data
`position` (when supplied) → name (the stable stand-in). `accumulate` counts
**FINISHED, IN_PLAY, and PAUSED** matches (in-progress scores are provisional but
move the table live, matching football-data and the match list); SCHEDULED/TIMED
rows carry null scores and are skipped. `rankThirds` ranks the 12 third-placed
teams (best 8 advance to the R32) by points → GD → goals → name; no head-to-head
since thirds sit in different groups. The amber best-thirds highlight shows **live**
("as it happens") once all 12 groups have a third-placed team that has played at
least one match (`thirdsComparable`) — the ranking is provisional mid-stage and
settles into the real cut-off as the final matchday completes. The Bracket tab does
**not** use any of this — it fills knockout slots from the fixture list.

### Knockout results from ESPN (`netlify/lib/espn.mts`)
**Knockout result fields come from ESPN, not football-data.** FD's free tier
serves a corrupt `score.fullTime` for penalty/extra-time matches (Germany–Paraguay
R32 came back `5-6`, winner `null`, pens `5-5`, when it finished 1-1 / Paraguay 4-3
on pens — the correct 1-1 was only in `regularTime`). ESPN's free, keyless
scoreboard (`site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard`)
reports the clean post-ET score in `competitor.score` and the shootout in
`competitor.shootoutScore` — exactly the 90'+ET / penalty split our schema stores.
**Group results and official standings stay on football-data;** only knockout
results switch.
- `espn.mts` (pure, unit-tested in `espn.test.mts`): `parseEspnScoreboard` maps
  ESPN → our vocabulary (`status` FINISHED/IN_PLAY/PAUSED/TIMED via
  `mapEspnStatus`; `duration` REGULAR/EXTRA_TIME/PENALTY_SHOOTOUT via
  `espnDuration`). It's deliberately defensive (the endpoint is undocumented /
  ToS-gray): malformed events are skipped, and a scheduled fixture's `0-0` is
  stored as null, not a real draw.
- Linking is by **exact kickoff instant** (`indexEspnByInstant`) — no two
  knockout rows share a kickoff, and ESPN's kickoff instants + team abbreviations
  match ours, so no ESPN-id map is needed (unlike FD's `KNOCKOUT_FD_ID_TO_NUMBER`).
- `sync-results.mts` makes **one ranged ESPN request** (`?dates=min-max` spanning
  every knockout kickoff date) gated to fire only when a knockout row is in its
  live window (3h before → 6h after kickoff) and not yet finalized — so it's zero
  ESPN calls during the group stage / pre-tournament / once knockouts are done.
  Knockout rows are driven by ESPN **only** (FD's knockout score is never written),
  holding the prior value when ESPN has nothing usable and never regressing a
  recorded final. Best-effort like standings: an ESPN failure leaves prior results
  intact. `result_locked` (below) still overrides everything. Response reports
  `espnFetched`/`espnKnockout`.

### Admin result locks (`0006_result_lock.sql`)
`matches.result_locked` lets an admin's manual result survive the 10-min sync:
when set, the sync function skips the result fields (status/scores/pens/duration)
for that row but keeps reconciling fixture metadata (teams, kickoff, `fd_id`).
Unlocking re-opens the row to the API (or, for a knockout row, to ESPN).

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
  `RequireUsername` holds the user at `/welcome` until they pick one. (Migration
  `0014` dropped the old trusted-metadata branch, so the trigger now always
  assigns the unchosen fallback regardless of any `username` in signup metadata
  — closing the latent self-provisioning path if email/password is ever
  re-enabled at the auth provider.)
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
- `netlify/functions/sync-results.mts` — runs every 2 min (cron `*/2 * * * *`), auth-gated so only Netlify's scheduler or an admin bearer token can invoke its public HTTP endpoint (see "Sync auth gate"), guarded to the tournament window and throttled to ≈1 fetch/min by the 60s cooldown (so it stays well under football-data's free-tier rate limit). Fetches `competitions/WC/matches` from football-data.org v4 and upserts results. Holds a row's prior result (skips result fields) while the API reports a match `FINISHED` without a score yet, so scoring/form/standings never see a finished match with null scores. Links API matches to our rows via the unit-tested 4-pass linker in `netlify/lib/link-matches.mts` (explicit `fd_id` → exact kickoff instant → team codes → unique stage+day) — it links only when unambiguous, and unlinked matches are counted in the function's JSON response. That same module exports `canonicalTla`, which the sync runs every stored team code through (`matches.home_code`/`away_code`, `standings.team_code`) to pin football-data's inconsistent TLAs to one canonical value (Uruguay `URU`/`URY` → `URU`) — otherwise a code that flip-flops across responses would oscillate in our `matches` table and make the `team_form`/in-tournament joins blink out. Skips result fields for rows with `result_locked = true` (see admin result locks above). It then also fetches `competitions/WC/standings` and upserts the official group order into the `standings` table (best-effort — a standings failure never fails the match sync; see "Group standings & best thirds").
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

### Hosting & parallel deploys (`netlify.toml`, `wrangler.jsonc`)
The frontend is a static Vite SPA reading **directly from Supabase**, so the same
`dist/` build can be served from **multiple hosts at once** — they all read the
same backend and stay identical. This is used to dodge region-level blocks of the
shared `*.netlify.app` domain (some ISPs/countries throttle the whole wildcard):
the app is served from **Netlify** *and*, in parallel, from **Cloudflare Workers**
static assets (`wrangler.jsonc` publishes `dist/`). Custom subdomains (e.g.
`wc26.alisalem.ca`) point at whichever host; for a blocked region, hand out the
Cloudflare one (its edge isn't caught by the Netlify wildcard block).

**Both hosts must redeploy together or they drift.** Netlify is wired to the
repo and rebuilds itself on every push to `main`; the Cloudflare side is driven
by the `.github/workflows/deploy-cloudflare.yml` GitHub Action (build `dist/` →
`cloudflare/wrangler-action`) on the same push, so a change can't land on one
host but not the other. The Action needs four repo secrets —
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and the public
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` build vars; `workflow_dispatch`
allows a manual re-run, and `npx wrangler deploy` is still the local fallback.

Two host-specific rules to keep straight:
- **The sync cron runs on Netlify only.** `sync-results` just writes results into
  Supabase, so it must live in exactly one place; the Cloudflare deploy serves the
  SPA and reads the same data. Don't duplicate it (and the Cloudflare deploy needs
  **no** server-only secrets — only the `VITE_*` build vars).
- **SPA fallback is configured per host, and they are not interchangeable.**
  Netlify uses the `[[redirects]]` rule in `netlify.toml`; Cloudflare Workers uses
  `assets.not_found_handling: "single-page-application"` in `wrangler.jsonc`. Do
  **not** add a `public/_redirects` with `/* /index.html 200` — Cloudflare's
  static-asset validator rejects it as an infinite-loop self-redirect and fails
  the deploy.

**Every serving domain must be allowlisted for OAuth or sign-in silently bounces
to the wrong host.** `signInWithGoogle` requests `redirectTo:
${window.location.origin}/`, but Supabase honors it only if it matches the
**Redirect URLs** allowlist — otherwise it falls back to the **Site URL** (which
reads as "login redirected me back to the *other* deploy"). For each domain add
`https://<domain>/**` (the `/**` wildcard is required — a bare domain won't match
the trailing `/`) to Supabase → Auth → URL Configuration, and add the origin to
the Google OAuth client's **Authorized JavaScript origins**.

## Gotchas

- **Keep `src/lib/scoring.ts` and the SQL scoring functions in sync** when changing point values or rules — they are duplicated by design (DB authoritative, client for display).
- **Use `border-ink` (not plain `border`) for a card/control's structural outline.** Plain `border` resolves to the faint hairline `--border` token; the strong outline is the separate `--ink` token. The two are intentionally different (see the design-system note above).
- **The sticky `DayHeader` offset (`top-14`) tracks the `h-14` app header in `Layout.tsx`.** If you change the header height, update `DayHeader`'s `top-*` to match or the day strip will misalign.
- **Animate with the motion tokens, not literals** — `duration-[var(--duration-*)]` and the `ease-*` utilities (see "Motion & animation"), and run the `/web-animation-design` skill before adding/altering motion. A `motion`-driven (Framer) component is *not* covered by the CSS `prefers-reduced-motion` backstop; gate it with `useReducedMotion()`. A `SegmentedControl` `layoutId` must be unique per mounted instance or the shared-layout pills will jump between controls.
- **`USERNAME_RE` in `src/pages/Welcome.tsx` mirrors the `username_format` SQL check** (in both `username_format` and `set_username`) — keep them identical if you change the allowed username shape.
- `matches.id` is the official match number 1..104 (not a surrogate key); `fd_id` is the football-data.org id and is nullable until linked by the sync.
- **Knockout `matches.id` must be the *official* FIFA match number, and those are NOT chronological** — e.g. Brazil–Japan kicks off before Germany–Paraguay yet is officially match 76, not 74. The bracket linkage (`FEEDERS` in `src/components/Bracket.tsx`) is keyed by official number, so a slot holding the wrong fixture makes the *wrong winners meet in the next round*. football-data's feed carries no official number (its `fd_id`s aren't in bracket order, and `matchday` is null for knockouts), so the API seed pins each knockout fixture to its slot via `KNOCKOUT_FD_ID_TO_NUMBER` in `scripts/fd-shared.ts` (source: openfootball `2026--usa/cup_finals.txt`). **Do not number knockout matches by kickoff time** — only the 1..72 group stage is safe to number chronologically. If a knockout fd_id is missing from that map the seed throws (fail loud). Rows seeded before that fix were renumbered once in production via `scripts/sql/2026-knockout-renumber.sql` — a single-transaction, whole-row move (drop predictions FK → shift ids/predictions to a +1000 temp range → remap to official numbers → restore FK) so each row's teams/kickoff/fd_id and the 4 knockout predictions travel together. **Applied 2026-06-28; it's idempotent-ish (no-op on already-correct data) and should not need re-running.**
- **`team_form.code` is the football-data TLA** and must match `matches.home_code`/`away_code` for the form chips to join. Because football-data serves some teams under inconsistent TLAs (Uruguay `URU`/`URY`, flip-flopping across responses), the sync canonicalizes every stored code via `canonicalTla` (`netlify/lib/link-matches.mts`) — so `team_form.code` must use that **canonical** value (Uruguay = `URU`, matching `teams.ts`/`standings`). If a team's form silently disappears, suspect a new such split: add the alias to `canonicalTla` (one entry fixes both linking and the stored-code pinning) — **don't** flip the `team_form` key, which only moves the breakage. (`team_form.api_id` is vestigial — left nullable from the abandoned API path; the form data is static.)
- Schema changes go in a Supabase migration under `supabase/migrations/`; remember RLS implications for any new table/column.
- **The app is served from two hosts in parallel (Netlify + Cloudflare Workers) off the same `dist`/Supabase** — keep the per-host SPA fallback split (`netlify.toml` vs `wrangler.jsonc` `not_found_handling`; **no** `public/_redirects` — Cloudflare rejects its self-loop), run the sync cron on Netlify only, and allowlist **every** serving domain for OAuth as `https://<domain>/**` (see "Hosting & parallel deploys").

## Commit conventions

- **Never put a `Claude-Session:` line (or any `https://claude.ai/code/session_…`
  URL / session link) in a commit message.** Those links are private to the
  authoring session and must not be committed. Strip any such line before
  committing.
