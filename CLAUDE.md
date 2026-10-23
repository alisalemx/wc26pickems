# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

An unofficial prediction game for the 2026 World Soccer Tournament. Players predict exact scores
for all 104 matches and compete on a shared leaderboard. The tournament is
over: results synced automatically during it, and the site is now a read-only
portfolio piece.

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
(`src/lib/*.test.ts` — scoring, format, form, standings, bracket, rank, awards,
links) and `scripts/fd-shared.test.ts`.

**Supabase keep-alive (`worker/index.ts`).** Supabase's free tier pauses a
project that doesn't get "a few user requests to the database each day" over a
7-day window ([docs](https://supabase.com/docs/guides/platform/free-project-pausing)),
and since the tournament ended nothing else touches the DB. So the Cloudflare
Worker's cron trigger (`0 * * * *` in `wrangler.jsonc`) does one tiny `matches`
read an hour with the public anon key. A once-a-day read (2026-10-14 → 21)
still drew a pause warning, so don't thin it out, and don't remove it unless the
project moves to a paid plan. It needs the `SUPABASE_URL` and
`SUPABASE_ANON_KEY` Worker secrets, which the deploy Action sets from the
`VITE_*` repo secrets; a failed run shows as an error in the Worker's cron
events in the Cloudflare dashboard. It's the only Supabase project on the
account, so this Worker is the account's one keep-alive trigger; if another
Supabase project appears, ping it from this same trigger rather than spending
another of the free plan's 5 cron triggers.

Env vars live in `.env` (copy from `.env.example`). `VITE_*` are public/client;
`SUPABASE_SERVICE_ROLE_KEY` and `FOOTBALL_DATA_TOKEN` are server-only (seed scripts).

## Architecture

Vite + React 19 SPA, Supabase (Postgres + Auth + RLS) backend, hosted on
Cloudflare Workers. Path alias `@/` → `src/`. shadcn/ui (new-york style) in
`src/components/ui/`; Tailwind v4 configured CSS-first via `@theme` in `src/index.css`.

### Design system ("Signage", Pitch palette)
**Design direction: Signage**, the transit-sign variant of Ali's *Playful tech*
direction (his AliOS note `work/notes/design-directions/playful-tech-signage.md`),
in the **Pitch** palette Ali picked on 2026-10-23: turf green on warm paper.
Don't re-ask which direction applies; build on this one. It replaced the earlier
"polished neo-brutalist" look (outlines + offset shadows + Space Grotesk).

Theme tokens live in `src/index.css` (`:root` light, `@media (prefers-color-scheme: dark)`
dark — no manual toggle). The rules of the look:
- **Flat panels, no outlines, no shadows.** White cards (`rounded-xl`) sit on the
  warm paper ground (`--background`) and separate by tone alone; dark mode is a
  near-black ground with green-graphite panels. `--border` is only a hairline for
  row dividers and the header edge. Don't bring back `border-ink` card outlines or
  offset shadows.
- **One bold colour, `--signal` (turf green), used sparingly**: the logo's pitch
  mark, the champion hero, the Exact badge, the leader's rank bullet and podium
  bar, the Final stage tag, "Today", and the Final's bracket ring. Its pale tint `--win` (a `color-mix` of
  the signal into the card) marks the quieter "correct" states: the Outcome badge,
  W form pills, the viewer's own leaderboard row, and a qualifying third. Red
  (`--destructive`) is live/loss/error only. Keep green from meaning two things.
- **Neutrals carry the paper's warmth** (no cold grey). `--muted-foreground` is
  secondary body text; `--quiet` is the second line of a two-tone heading and the
  loser's name (large or bold text only); `--track` is a control's well on the
  ground (tabs, segmented control); `--sunk` is an inset block inside a white panel
  (podium plinths).
- **Ink is the action colour.** `primary` is near-black (inverted to near-white in
  dark mode): primary buttons, the active tab/nav pill, day arrows, the reminder
  panel. Buttons, tabs, badges, and the segmented control are pills
  (`rounded-full`).
- **Type is Inter** with its optical-size axis (`@fontsource-variable/inter/opsz.css`,
  `--font-sans`, `font-optical-sizing: auto`), so large text gets Inter's tighter
  Display cut on its own. Keep manual tracking gentle (Ali found Inter Tight plus
  heavy negative tracking too tight): `--tracking-tight` is -0.011em, `h1`–`h3`
  are -0.017em, scores and the hero word use `tracking-display` (-0.025em), and
  body text keeps Inter's own spacing. Every changing number is `tabular-nums`,
  body text is antialiased (`@layer base`), and copy is sentence case everywhere,
  with no all-caps labels.
- **Focus rings are neutral** (`--ring` is the ink colour, 2px), never green.
- **The logo is a pitch mark beside the two-tone wordmark** (`PitchMark` and
  `Wordmark` in `Layout.tsx`): a turf-green rounded rectangle with the halfway
  line, centre circle, and penalty boxes in `--signal-foreground`, picked by Ali
  on 2026-10-23. The favicon (`favicon.svg`, `favicon.ico`) and the app icons in
  `public/` redraw it as a square tile, with the light theme's signal colours
  baked in as hex (`#2eb45c` ground, `#0c1a0f` lines). The maskable and Apple
  icons run full bleed, since the OS rounds them. Redraw all of them if the mark
  changes.

**Pressed states are a uniform convention: every interactive element settles on a
subtle background tint while held (`:active`) — no scale or translate — and the
tint matches the element.** Three tiers:
- **Filled buttons** deepen their own fill: `default` → `active:bg-primary/75`,
  `signal` → `active:bg-signal/75`, `destructive` → `active:bg-destructive/80`.
- **Accent buttons** (`outline`/`secondary`/`ghost`, whose hover is `--accent`)
  deepen to `--accent-pressed` (the `bg-accent-pressed` utility — one step past
  `--accent`, darker in light / lighter in dark so press reads distinct from hover).
- **Neutral chrome** (tabs, segmented control, nav items, text links) presses to
  the adaptive `active:bg-foreground/10` — a hueless ink tint.

The **`Switch`** is the one outlier: it darkens via `active:brightness-95` so the
press doesn't paint over its on/off state colour. Tinted text links pad the
highlight with `rounded-sm -mx-1 px-1` so it doesn't hug the glyphs. All are CSS
`transition`s, so the global `prefers-reduced-motion` backstop neutralizes their
timing automatically (no per-element gating needed).

Shared, restyle-once UI atoms live in `src/components/` (not `ui/`). Prefer these
over re-inlining the pattern so a design change lands everywhere:
- `SignHeading`: the **two-tone heading** (ink line over a `--quiet` line, same
  size and weight). Page titles, card titles, the day strip, the hero.
- `Bullet`: the **line bullet**, a number or letter in a flat colour disc, like a
  subway route sign. Ranks, group positions, W/D/L, numbered lists.
- `Flag`: a team's flag as a **round SVG badge** (from `flag-icons`, bundled per
  team via the brace glob in `src/lib/flags.ts`; `flags.test.ts` fails if a team's
  file is missing). Never use flag emoji: Windows renders them as two letters.
- `TeamDisplay`, `StageBadge`, `DayHeader`, `SegmentedControl`, `EmptyState`,
  `ListSkeleton`, `AuthShell`, and `PlayerSummary` (`RankSummary`, `PickRow`,
  `SettledList`, shared by `/me` and the player pages; the filter list is in
  `src/lib/filters.ts`).

`StageBadge` renders a match's stage as **one flat `secondary` tag for every
round** (with the `×N` multiplier appended for knockout stages); the **Final
alone** is set apart, in the flat `signal` badge. If you reintroduce a per-stage
colour distinction, keep the Final the only special one.

**Layout:** the shell is `max-w-6xl`. Navigation **floats**: a frosted pill
top bar (inset from the edges, lined up with the content width) holds the
logo, the nav on desktop (`md`+), and sign-in; on phones the tabs sit in a
matching frosted pill floating above the home indicator, and the sticky day
strip is a third floating pill that parks under the top bar. No shadows and no
borders: the pills use `--bar`, a frosted fill halfway between the sand ground and the
white cards (lighter than both in dark mode), so they read as a soft step on the
ground and over a card alike. Keep it translucent (~72%) with the backdrop blur:
the frosted glass is the point, and a near-opaque fill hides it.
Pages use the width: match cards in two columns from `lg`, Podium and Hall of fame
side by side, the Leaderboard beside the Hall of fame, `/me` and player pages with
a sticky summary column, group tables in a 2–3 column grid, and the bracket showing
**every round as full cards** once five columns fit (`WIDE_MIN` in `Bracket.tsx`;
narrower screens keep the focus-a-round selector). Wrap page grids in
`grid-cols-1` so a wide child (a nowrap segmented control) can't push the page
past the viewport. A "Made by Fluffy Pixel" sign-off (linking to fluffypixel.ca)
closes every page; keep it.

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
`countdown-pulse` (clock icon in the final minutes before kickoff), `rank-pop`
(the rank bullet's reveal on `/me` and the player pages, a scale-in with
overshoot), `podium-fill` (`.podium-bar`, the finale podium bars rising from the
floor), and `match-highlight` (the one-shot green flash on the card the "Predict
next" panel jumps to). Signage is flat, so there are no gradient sheens or
flowing-gradient CTAs; don't add them back.
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

Because scoring is recomputed on read, admin corrections reflect on the leaderboard instantly. `src/lib/scoring.ts` is a **mirror of this
SQL for client-side display labels only** ("worth up to N pts") — its
`STAGE_MULTIPLIER` and `scorePrediction()` must be kept in sync with the SQL
functions, but never become the actual score.

The Leaderboard's `ScoringGuide` modal (the green **"Scoring system"** link,
`src/components/ScoringGuide.tsx`) explains the rules to players — a per-match
legend, the stage-multiplier table, and a penalty-shootout worked example
(Brazil 1–1 Argentina, decided on penalties) showing how only the 90'+ET score
counts. All point values derive from the `scoring.ts` constants, so it tracks
any change there automatically. It also documents the leaderboard tie-breakers
(below). `remainingMaxPoints()` (`scoring.ts`, display-only like the rest) sums
the exact-score value of every match not yet finished — the "up to N pts still
up for grabs" line on the Leaderboard and `/me`.

### Leaderboard ranking & tie-breakers (`src/lib/rank.ts`)
The leaderboard query (`useLeaderboard`) sorts by total points → most exact
scores → most correct outcomes → **fewest scored predictions** (with the first
three tied, fewer scored predictions means fewer misses) → username (not a
ranking criterion — just keeps fully-tied rows stable across refetches so the
layout animation doesn't shuffle them). `competitionRanks()` (`rank.ts`,
unit-tested) then assigns standard competition ("1224") ranks over that order:
rows tied on all four criteria share a rank. Every surface that shows a
position (Leaderboard, `/me` rank reveal, PlayerPage, the finale podium) uses
it, so shared ranks agree everywhere.

### Player pages (`/player/:userId`)
Leaderboard rows link to a per-player page showing their revealed picks —
`usePlayerScoredPredictions` reads the `scored_predictions` view directly, and
RLS (`security_invoker`) means you only get another player's post-kickoff rows
(all of your own). Renders their rank (via `competitionRanks`) and stats in the
shared `RankSummary`, and a settled-picks list with the same
All/Outcome/Exact/Miss filter idiom as `/me` (both pages build on
`PlayerSummary.tsx`).

### Anti-cheat via Row Level Security (`0001_init.sql`)
Enforced by Postgres `now()` vs `matches.kickoff`, never by the UI:
- Predictions can only be inserted/updated while `kickoff > now()` **and** the
  match `status` is still pre-match (`TIMED`/`SCHEDULED`) — `0018`. The status
  check covers a kickoff stored later than the real one (the feeds have
  mis-timed matches), so a live match can't take picks. The client mirrors it in
  `isPredictionLocked` (`src/lib/format.ts`), which drives the Save button.
- You can read others' predictions for a match only after its kickoff (`read predictions after lock`); your own are always visible.
- `matches` updates restricted to admins (`is_admin()`); `profiles.is_admin` is protected by a column-level grant so users can't self-escalate.
- The `matches` table is **publicly readable** (`0004_public_matches.sql` grants
  `select` to `anon`) so fixtures and standings render for logged-out visitors.
- **The rest of the app is publicly readable too, read-only (`0019_public_read.sql`).**
  The tournament is over and the site is a portfolio piece, so `anon` can read
  the `leaderboard` and `scored_predictions` views, `predictions` rows for
  matches that have kicked off (`predictions readable by anon after kickoff`,
  the same reveal rule signed-in players get, so pre-kickoff picks stay
  hidden), and `profiles.id` + `username` only. That last one is a column
  grant: `is_admin`, `created_at`, and `username_chosen` stay hidden, and an
  anon `select=*` on `profiles` fails. Both views are `security_invoker`, so
  they need the table policies, not just the view grants. Writes stay locked:
  `anon` has no write policy anywhere, and its default write grants on
  `predictions` and `profiles` are revoked. `prediction_distributions()`,
  `username_available()`, and `set_username()` stay authenticated-only.
  Before opening this, every handle was replaced with a randomly assigned
  footballer pun (`scripts/sql/2026-anonymize-handles.sql`, applied
  2026-10-23) so the public pages don't reveal who played.

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
that whole chain, so the sync (now retired) upserted each team's
`position` + stats into the public, service-role-written `standings` table
(mirrors `matches`/`team_form`), read client-side via `useStandings`
(`["standings"]`, polled 60s). Two football-data quirks the data handles: its
standings count **in-progress matches** (a live result shows before the matches
feed flips to FINISHED), and it serves a few teams under an **inconsistent TLA** —
Uruguay comes back as `URU` or `URY` depending on both the feed and the individual
response (the free tier flip-flops it every couple of minutes). The sync pinned
every code it stored to one canonical TLA (`URU`), so `matches`/`standings`/`team_form` agree; the rows also key on
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

### Results sync (retired)
During the tournament a Netlify scheduled function synced results every 2
minutes: group results and official standings from football-data.org, knockout
results from ESPN's public scoreboard (football-data's free tier corrupted
penalty and extra-time scores), plus the live match minute (`matches.minute`,
`0015`) from ESPN's clock. It was removed after the final, along with Netlify
hosting; the code (`netlify/functions/sync-results.mts`, `netlify/lib/`) is in
the git history. Results now change only through the Admin page. The data
quirks it repaired, still visible in the stored data:
- Football-data served Uruguay as `URU` or `URY`; every stored code was pinned
  to the canonical `URU` (both codes still map in `flags.ts`).
- Football-data's standings lag its matches feed and count in-progress matches,
  so the Groups tab computes its own table (see "Group standings").
- Penalty/extra-time knockouts: Germany–Paraguay came back `5-6` with no winner
  when it finished 1-1, Paraguay 4-3 on pens; ESPN's split of the post-ET score
  and the shootout matches our `home_score`/`home_pens` columns.

### Admin result locks (`0006_result_lock.sql`)
`matches.result_locked` let an admin's manual result survive the (now retired)
sync, which skipped the result fields for a locked row. With no sync left the
flag no longer changes anything, but the Admin page still shows it.

### Knockout unlock (`0016_knockout_unlock.sql`)
A knockout slot's teams live in `matches.home_team`/`away_team`, and the RLS
insert/update policies require both non-null before a prediction is accepted
(the lock lifts when the slot is filled). Football-data assigns those slots on
its own laggy cadence (hours after the feeding matches finish), and the client
already resolves them instantly for **display** (`resolveKnockoutTeams`,
`src/lib/bracket.ts`) — so there was a window where a card showed its teams with
a live Save button while the DB row was still blank, and the write bounced off
RLS as a misleading "Could not save (match locked?)". This closes it by filling
the slot **server-side, in our own DB**, from our own results:
- `fill_ready_knockout_slots()` (SECURITY DEFINER, service-role only) fills each
  slot whose two feeders have both been FINISHED for a **10-minute settle
  window**, taking each side from the feeder winner (or SF *loser* for the
  third-place play-off). Only ever fills a NULL side, so it's idempotent and a
  real football-data assignment always wins. Its **FEEDERS map mirrors
  `src/lib/bracket.ts`** (`FEEDERS`/`THIRD_FEEDERS`) and its winner rule mirrors
  `winnerSide` (90'+ET, shootout only as decider) — keep the SQL and TS in sync.
- The retired sync called it via RPC each run after the result upserts, so a
  slot filled within ~one sync cycle of the settle window elapsing. Nothing
  calls it now.
- `matches.finished_at` (stamped by the `stamp_finished_at` trigger on the
  transition into FINISHED, cleared on regression) is the stable marker the
  settle window gates on — `updated_at` is bumped every sync so it can't.
- **Client companion:** `resolveMatch` tags a client-derived slot with the
  transient `teams_provisional` flag, and `MatchCard`'s `predictable` gate
  requires stored (non-provisional) teams — so the Save button can't get ahead
  of the DB again. The teams still display; the footer reads "Opens shortly"
  until the server fills the slot.

### Tournament finale (`tournamentChampion`, `src/lib/bracket.ts`)
`tournamentChampion(matches)` is the **single predicate every finale surface
gates on**: it returns the winning team of the final (match 104, judged by
`winnerSide` — 90'+ET, shootout only as decider) or null while the tournament
is live. Once it resolves:
- **ChampionBanner** (match list): the hero, a flat turf-green panel with the
  two-tone "World / champions" heading and the winner's flag over the team's
  name as one huge word that bleeds off the bottom edge. `useFitText` measures
  the word and sizes it to span the panel exactly (Inter's letter widths vary
  too much for a per-letter estimate), re-fitting on resize.
- **LeaguePodium** (same file, beside the Hall of fame): the league's top 3
  (2nd–1st–3rd), the leader's bar in `--signal` and 2nd/3rd on `--sunk`, rank
  numbers set large, bars filling from the floor via `.podium-bar` (its
  delay/duration is mirrored in `contentDelay()` in the component; keep them in
  sync). Off-podium viewers get a "You finished Nth of M" line. Visitors see it
  too (the standings are publicly readable).
- **LeagueAwards** ("Hall of fame", on the match list and the Leaderboard):
  Sharpshooter (most exact scores), Best single call (highest-points exact,
  earlier kickoff breaks ties), Ever-present (most scored predictions) — pure
  pickers in `src/lib/awards.ts` (unit-tested), fed by
  `useAllScoredPredictions` (every player's revealed scored picks in one query,
  enabled only once the tournament is over).
- The Leaderboard retitles to **"Final standings"**, `/me` shows a "Tournament
  complete" wrap with the viewer's own best call, the **nav reorders** to
  Matches, Leaderboard, Tournament (+ Me when signed in; `FINALE_NAV` in
  `Layout.tsx`), and the header's sign-in button drops "to play".

Related match-list notes while the tournament is live: **PenaltyNote** (the
dismissable penalties-don't-score reminder) shows through the group stage and
R32, and **StageMultiplierNote** replaces it from the R16 on — "this round is
worth ×N", tracking the current stage, with the dismissal stored per-stage in
localStorage so it reappears each round. Both stop rendering once
`tournamentChampion` resolves.

### Auth & identity / usernames (`0001_init.sql`, `0002_auth.sql`)
Sign-in is **Google OAuth only** (email/password was removed). OAuth needs a
Google client configured in the Supabase dashboard. The React flow lives in
`src/hooks/useAuth.tsx`: `signInWithGoogle` redirects to Google and back to `/`.

Signup is open to anyone. Each profile has a unique `username` (no first/last
name) rendered as `@handle` everywhere.
- Format `^[a-z0-9_]{3,20}$` and a unique index are enforced at the DB layer
  (`username_format` check + `profiles_username_key`), not just in the form.
- Google OAuth carries no username metadata, so `handle_new_user()` assigns a
  random `fan_xxxxxxxx` placeholder handle with `username_chosen = false`
  (`0018`; it used to be derived from the email local-part, which leaked part
  of the address to every player on the leaderboard), and
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
- `scripts/seed-matches.ts` — seeds fixtures from the committed `scripts/data/matches-2026.json` (offline) or live from the API (`SEED_SOURCE=api`). The committed JSON is illustrative; the API seed loads the official names and kickoff times.
- `scripts/fd-shared.ts` — football-data.org fetch/mapping helpers used by the seed/schedule scripts; `scripts/teams.ts` holds the team metadata (names, flags) used by `generate-schedule.ts`.
- `scripts/seed-team-form.ts` — one-time loader of the static `scripts/data/pre-tournament-form.json` into `team_form` (see "Team form" above). No live sync.

### Routing (`src/App.tsx`)
The app is **public and read-only for visitors**: Matches (index), Tournament,
Leaderboard, and PlayerPage (`/player/:userId`) all render without a session,
backed by the anon read grants (see "Anti-cheat via Row Level Security"), and
the finale podium, Hall of fame, and revealed picks show to visitors too.
Predicting still needs a session. `RequireUsername` lets anonymous visitors
through but funnels a signed-in user to `/welcome` until they pick a handle.
`ProtectedRoute` (session required, `src/hooks/useAuth.tsx`) gates only
MyPredictions (`/me`) and Admin; `AdminRoute` further gates `/admin`. `/welcome` needs a session but no handle;
`/login` is open. Pages: Matches (index), Leaderboard, Tournament (`/tournament`
— the renamed Standings page; `/standings` redirects there), MyPredictions
(`/me`), PlayerPage (`/player/:userId`), Admin, Login, Welcome (`/welcome`).
The **Admin tab is hidden from the nav** (route still reachable by URL), Me
shows only when signed in, and once the tournament ends the nav reorders to
Matches, Leaderboard, Tournament (see "Tournament finale").

### Hosting (`wrangler.jsonc`, `worker/index.ts`)
The frontend is a static Vite SPA reading **directly from Supabase**, served from
**Cloudflare Workers** static assets (`wrangler.jsonc` publishes `dist/`) at
`wc26.alisalem.ca`. The Worker script (`worker/index.ts`) only adds the hourly
Supabase keep-alive cron (see "Commands"); requests are answered by the assets.
Netlify used to serve it in parallel and run the sync; both were removed on
2026-10-23.

Every push to `main` deploys through `.github/workflows/deploy-cloudflare.yml`
(build `dist/` → `cloudflare/wrangler-action`). The Action needs four repo
secrets — `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and the public
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — and also stores the last two as
the Worker secrets `SUPABASE_URL` / `SUPABASE_ANON_KEY` for the cron.
`workflow_dispatch` allows a manual re-run, and `npx wrangler deploy` is the
local fallback (it keeps the Worker secrets already set).

**SPA fallback** is `assets.not_found_handling: "single-page-application"` in
`wrangler.jsonc`. Do **not** add a `public/_redirects` with `/* /index.html 200`
— Cloudflare's static-asset validator rejects it as an infinite-loop
self-redirect and fails the deploy.

**Security headers live in `public/_headers`** (Vite copies it to `dist/`), and
Cloudflare reads it: a CSP (`script-src 'self'`, `connect-src` limited to
`*.supabase.co`, `frame-ancestors 'none'`), plus `X-Frame-Options`, `nosniff`,
`Referrer-Policy`, and `Permissions-Policy`. **If you add a third-party origin**
(a font CDN, analytics, an image host, another API), add it to the matching CSP
directive or the browser will block it silently.

**Every serving domain must be allowlisted for OAuth or sign-in silently bounces
to the wrong host.** `signInWithGoogle` requests `redirectTo:
${window.location.origin}/`, but Supabase honors it only if it matches the
**Redirect URLs** allowlist — otherwise it falls back to the **Site URL**. For
each domain add `https://<domain>/**` (the `/**` wildcard is required — a bare
domain won't match the trailing `/`) to Supabase → Auth → URL Configuration, and
add the origin to the Google OAuth client's **Authorized JavaScript origins**.

## Gotchas

- **Keep `src/lib/scoring.ts` and the SQL scoring functions in sync** when changing point values or rules — they are duplicated by design (DB authoritative, client for display).
- **Keep the knockout `FEEDERS` bracket map in sync across `src/lib/bracket.ts` and `fill_ready_knockout_slots()` (`0016`)** — same duplication-by-design as scoring (DB fills the slot / lifts the prediction lock; client fills for display). A wrong feeder pairing sends the wrong team into the next round. See "Knockout unlock".
- **Panels are flat: no outlines and no shadows.** Cards separate from the ground by tone; `--border` is only for hairline row dividers. Reach for `--signal` (turf green) only where the design-system note lists it, and never use flag emoji (use `<Flag>`). See the design-system note above.
- **The floating top bar's footprint is `--header-h` in `src/index.css`** (the `pt-3` gap plus the `h-14` pill in `Layout.tsx`), and sticky content parks at `--sticky-top` below it. If you change the header's height or gap, update `--header-h` to match. The Matches scroll helpers (`goToDay`, `visibleBand`) measure the bars from the DOM (`data-app-header`, `data-day-strip`, `data-tab-bar`), so keep those attributes.
- **Animate with the motion tokens, not literals** — `duration-[var(--duration-*)]` and the `ease-*` utilities (see "Motion & animation"), and run the `/web-animation-design` skill before adding/altering motion. A `motion`-driven (Framer) component is *not* covered by the CSS `prefers-reduced-motion` backstop; gate it with `useReducedMotion()`. A `SegmentedControl` `layoutId` must be unique per mounted instance or the shared-layout pills will jump between controls.
- **`USERNAME_RE` in `src/pages/Welcome.tsx` mirrors the `username_format` SQL check** (in both `username_format` and `set_username`) — keep them identical if you change the allowed username shape.
- `matches.id` is the official match number 1..104 (not a surrogate key); `fd_id` is the football-data.org id (nullable; it was filled in by the sync).
- **Knockout `matches.id` must be the *official* FIFA match number, and those are NOT chronological** — e.g. Brazil–Japan kicks off before Germany–Paraguay yet is officially match 76, not 74. The bracket linkage (`FEEDERS` in `src/components/Bracket.tsx`) is keyed by official number, so a slot holding the wrong fixture makes the *wrong winners meet in the next round*. football-data's feed carries no official number (its `fd_id`s aren't in bracket order, and `matchday` is null for knockouts), so the API seed pins each knockout fixture to its slot via `KNOCKOUT_FD_ID_TO_NUMBER` in `scripts/fd-shared.ts` (source: openfootball `2026--usa/cup_finals.txt`). **Do not number knockout matches by kickoff time** — only the 1..72 group stage is safe to number chronologically. If a knockout fd_id is missing from that map the seed throws (fail loud). Rows seeded before that fix were renumbered once in production via `scripts/sql/2026-knockout-renumber.sql` — a single-transaction, whole-row move (drop predictions FK → shift ids/predictions to a +1000 temp range → remap to official numbers → restore FK) so each row's teams/kickoff/fd_id and the 4 knockout predictions travel together. **Applied 2026-06-28; it's idempotent-ish (no-op on already-correct data) and should not need re-running.**
- **`team_form.code` is the football-data TLA** and must match `matches.home_code`/`away_code` for the form chips to join. Because football-data serves some teams under inconsistent TLAs (Uruguay `URU`/`URY`, flip-flopping across responses), the sync canonicalized every stored code — so `team_form.code` must use that **canonical** value (Uruguay = `URU`, matching `teams.ts`/`standings`). **Don't** flip the `team_form` key to an alias, which only moves the breakage. (`team_form.api_id` is vestigial — left nullable from the abandoned API path; the form data is static.)
- Schema changes go in a Supabase migration under `supabase/migrations/`; remember RLS implications for any new table/column.
- **Revoking a function's EXECUTE needs `from public, anon, authenticated`, not just `from public`.** Supabase's default privileges grant EXECUTE on every new `public` function to `anon` and `authenticated` explicitly, so a bare `revoke ... from public` leaves it callable through `/rest/v1/rpc` (this left `fill_ready_knockout_slots()` open to logged-out visitors until `0018`). The same default grants SELECT on new views to `anon`. Run the Supabase security advisor after any migration that adds a function or view.
- **Keep the pre-match status list in sync across `isPredictionLocked` (`src/lib/format.ts`) and the predictions RLS policies (`0018`)** — the DB rejects the write, the client hides the Save button; if they disagree, players see a Save that bounces.
- **The Cloudflare deploy Action pins `wranglerVersion: "4"` on purpose.** `cloudflare/wrangler-action@v3` bundles wrangler 3.90.0, which is too old for this `wrangler.jsonc`; `wrangler@^4` is also a devDependency so local `npx wrangler deploy` matches CI. Don't unpin it.
- **Don't remove the keep-alive cron** in `wrangler.jsonc` / `worker/index.ts` while Supabase is on the free plan, or the project pauses within a week (see "Commands").

## Commit conventions

- **Never put a `Claude-Session:` line (or any `https://claude.ai/code/session_…`
  URL / session link) in a commit message.** Those links are private to the
  authoring session and must not be committed. Strip any such line before
  committing.
