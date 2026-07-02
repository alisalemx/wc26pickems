import type { Config } from "@netlify/functions"
import { createClient } from "@supabase/supabase-js"
import { linkMatches, canonicalTla } from "../lib/link-matches.mts"
import type { ApiMatchLite } from "../lib/link-matches.mts"
import { isSyncAuthorized } from "../lib/sync-auth.mts"
import {
  parseEspnScoreboard,
  indexEspnByPair,
  espnPairKey,
  type EspnResult,
} from "../lib/espn.mts"

type Stage = "GROUP" | "R32" | "R16" | "QF" | "SF" | "THIRD" | "FINAL"

function mapStage(apiStage: string): Stage {
  switch (apiStage) {
    case "GROUP_STAGE":
      return "GROUP"
    case "LAST_32":
    case "ROUND_OF_32":
      return "R32"
    case "LAST_16":
    case "ROUND_OF_16":
      return "R16"
    case "QUARTER_FINALS":
      return "QF"
    case "SEMI_FINALS":
      return "SF"
    case "THIRD_PLACE":
      return "THIRD"
    case "FINAL":
      return "FINAL"
    default:
      // Fail loud rather than silently scoring an unknown stage at the GROUP
      // (×1) multiplier — a wrong multiplier corrupts the leaderboard
      // undetected, whereas a thrown error stops the sync visibly.
      throw new Error(`Unknown football-data stage: ${apiStage}`)
  }
}

interface ApiMatch {
  id: number
  utcDate: string
  status: string
  stage: string
  group: string | null
  matchday: number | null
  homeTeam: { name: string | null; tla: string | null } | null
  awayTeam: { name: string | null; tla: string | null } | null
  score: {
    duration: string
    winner: string | null
    fullTime: { home: number | null; away: number | null }
    penalties?: { home: number | null; away: number | null }
  }
}

interface ApiStandingsTable {
  stage: string
  type: string
  group: string | null
  table: {
    position: number
    team: { id: number; name: string | null; tla: string | null }
    playedGames: number
    won: number
    draw: number
    lost: number
    points: number
    goalsFor: number
    goalsAgainst: number
  }[]
}

export default async (req: Request) => {
  // Auth gate, before any env read, DB query, or upstream fetch: this function
  // is publicly reachable at /.netlify/functions/sync-results, so reject anyone
  // who is neither Netlify's scheduler (recognized by the next_run body it
  // sends) nor an admin holding SYNC_SECRET. The cron needs no secret, so this
  // never takes the schedule offline. See isSyncAuthorized for the trade-offs.
  if (!(await isSyncAuthorized(req, process.env.SYNC_SECRET))) {
    return new Response("unauthorized", { status: 401 })
  }

  const now = new Date()
  // Date guard: skip API calls entirely outside the tournament window.
  if (
    now < new Date("2026-06-10T00:00:00Z") ||
    now > new Date("2026-07-21T00:00:00Z")
  ) {
    return new Response("off-season", { status: 200 })
  }

  const token = process.env.FOOTBALL_DATA_TOKEN
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!token || !supabaseUrl || !serviceKey) {
    return new Response("missing env vars", { status: 500 })
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  // Load our rows once, up front. This single query drives the link/update
  // below, supplies the cooldown timestamp, and carries the prior results we
  // hold on to when the feed is half-synced or regressing. Confirming the DB is
  // healthy before spending a football-data request also means a Supabase
  // outage can't slip the cooldown open and burn quota every run.
  const { data: rows, error: loadErr } = await db
    .from("matches")
    .select(
      "id, fd_id, stage, kickoff, home_team, away_team, home_code, away_code, result_locked, status, home_score, away_score, updated_at"
    )
  if (loadErr) {
    return new Response(`db load error: ${loadErr.message}`, { status: 500 })
  }
  const ourRows = rows ?? []

  // Throttle upstream calls to protect the football-data.org quota. The 2-min
  // cron clears this 60s window so every scheduled run fetches (≈1 req/min, well
  // under the free tier), while a closely-spaced authorized hit (an admin
  // force-sync, or a crafted call that slipped past the gate) returns early.
  // (Anonymous abuse is already 401'd above, before this DB read.)
  const COOLDOWN_MS = 60_000
  const lastSync = ourRows.reduce((max, r) => {
    const t = r.updated_at ? new Date(r.updated_at).getTime() : 0
    return t > max ? t : max
  }, 0)
  if (now.getTime() - lastSync < COOLDOWN_MS) {
    return new Response(JSON.stringify({ skipped: "recently synced" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }

  // Index rows by id so the update loop can compare against the result we
  // already hold (see the hold logic below).
  const rowById = new Map<number, (typeof ourRows)[number]>(
    ourRows.map((r) => [r.id as number, r])
  )

  // Build a set of row ids whose results have been manually locked by an admin.
  // The sync skips result fields for these rows but keeps updating fixture metadata.
  const lockedIds = new Set<number>(
    ourRows.filter((r) => r.result_locked).map((r) => r.id as number)
  )

  // Fetch the official fixtures. Bound the request so a stalled upstream (a TCP
  // hang, not a 5xx) can't pin the function open until Netlify's timeout; treat
  // an abort / network failure as a soft 502.
  const res = await fetch(
    "https://api.football-data.org/v4/competitions/WC/matches",
    { headers: { "X-Auth-Token": token }, signal: AbortSignal.timeout(8000) }
  ).catch(() => null)
  if (!res) {
    return new Response("football-data fetch failed", { status: 502 })
  }
  if (!res.ok) {
    return new Response(`football-data error ${res.status}`, { status: 502 })
  }
  const body = (await res.json().catch(() => null)) as {
    matches?: ApiMatch[]
  } | null
  const matches = body?.matches
  if (!Array.isArray(matches)) {
    return new Response("football-data returned no matches array", {
      status: 502,
    })
  }

  const apiLite: ApiMatchLite[] = matches.map((m) => ({
    fdId: m.id,
    stage: mapStage(m.stage),
    utcDate: m.utcDate,
    homeTla: m.homeTeam?.tla ?? null,
    awayTla: m.awayTeam?.tla ?? null,
  }))

  const links = linkMatches(ourRows, apiLite)

  // Knockout results come from ESPN, not football-data: FD's free tier serves a
  // corrupt score.fullTime for penalty/extra-time matches (see espn.mts). We
  // only fetch ESPN when a knockout row is in its live window — from a few hours
  // before kickoff until well after — and isn't already finalized. Outside those
  // windows (group stage, pre-tournament, knockouts all done) this stays at zero
  // ESPN calls. One ranged request covers the whole knockout stage.
  const KO_LEAD_MS = 3 * 60 * 60_000
  const KO_TRAIL_MS = 6 * 60 * 60_000
  const nowMs = now.getTime()
  const koRows = ourRows.filter((r) => r.stage !== "GROUP" && r.kickoff)
  const needEspn = koRows.some((r) => {
    const finalized = r.status === "FINISHED" && r.home_score != null
    if (finalized) return false
    const k = new Date(r.kickoff as string).getTime()
    return k - KO_LEAD_MS <= nowMs && nowMs <= k + KO_TRAIL_MS
  })

  let espnByPair = new Map<string, EspnResult>()
  let espnFetched = false
  if (needEspn) {
    // Range the request across every knockout kickoff date (±1 day for the feed's
    // timezone filing). Best-effort: any failure leaves knockout rows holding
    // their prior result — we never fall back to FD's bad knockout score.
    const koMs = koRows.map((r) => new Date(r.kickoff as string).getTime())
    const fmt = (ms: number) => {
      const d = new Date(ms)
      const p = (n: number) => String(n).padStart(2, "0")
      return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`
    }
    const from = fmt(Math.min(...koMs) - 24 * 60 * 60_000)
    const to = fmt(Math.max(...koMs) + 24 * 60 * 60_000)
    const espnRes = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${from}-${to}`,
      { signal: AbortSignal.timeout(8000) }
    ).catch(() => null)
    if (espnRes?.ok) {
      const espnBody = await espnRes.json().catch(() => null)
      // Link by team pair, not kickoff instant: a delayed knockout keeps its
      // teams but shifts its start time, and FD (which we key the loop on) can
      // lag or mis-time that shift. `canonicalTla` folds ESPN's codes into the
      // same space as our stored ones so a variant TLA still matches.
      espnByPair = indexEspnByPair(parseEspnScoreboard(espnBody), canonicalTla)
      espnFetched = espnByPair.size > 0
    }
  }

  let updated = 0
  let failed = 0
  let unlinked = 0
  let espnKnockout = 0

  for (const m of matches) {
    const stage = mapStage(m.stage)
    const ourId = links.get(m.id)
    if (ourId == null) {
      unlinked++
      continue
    }

    const ft = m.score?.fullTime ?? { home: null, away: null }
    const pens = m.score?.penalties ?? { home: null, away: null }

    // football-data BAKES THE SHOOTOUT INTO `fullTime` for penalty-decided
    // matches: fullTime = regularTime + extraTime + penalties (a 1-1 game won
    // 4-3 on pens reports fullTime 5-4, penalties 4-3). But home_score/away_score
    // are the 90'+ET result — predictions are scored on them, W/D/L form reads
    // them, and the card's "Result" shows them — while the shootout is display-
    // only (home_pens/away_pens). So strip the shootout back out to recover the
    // pre-penalty score. `penalties` is null for non-shootout matches, so this is
    // a no-op there and `fullTime` passes through unchanged.
    const result = {
      home: ft.home != null ? ft.home - (pens.home ?? 0) : null,
      away: ft.away != null ? ft.away - (pens.away ?? 0) : null,
    }

    // Hold the result we already have (skip result fields, still reconcile
    // fixture metadata) when:
    //  - an admin locked the row;
    //  - the feed reports FINISHED but the score hasn't landed yet — it flips to
    //    FINISHED a beat before the score is entered upstream, briefly reporting
    //    a finished match with a null fullTime (a real 0-0 arrives as 0/0, not
    //    null, so nothing legitimate is held back); or
    //  - the feed regresses a match we already recorded as finished back to a
    //    non-finished status, which would otherwise null out a real result and
    //    zero its leaderboard contribution until the feed corrects.
    // Holding keeps scoring, form, and the standings gate from ever seeing a
    // finished match with null scores.
    const cur = rowById.get(ourId)
    const haveRecordedFinal =
      cur?.status === "FINISHED" &&
      cur.home_score != null &&
      cur.away_score != null
    const finishedButScoreless =
      m.status === "FINISHED" && (ft.home == null || ft.away == null)
    const regressing = m.status !== "FINISHED" && haveRecordedFinal

    // Resolve each side's canonical code once — used both for storage below and
    // for the ESPN pair-link. Coalesce to the stored value when the feed hands
    // back null (see the fixture-field note below).
    const homeCode = canonicalTla(m.homeTeam?.tla ?? null) ?? cur?.home_code ?? null
    const awayCode = canonicalTla(m.awayTeam?.tla ?? null) ?? cur?.away_code ?? null

    // Knockout rows link to ESPN by team pair (robust to a delayed kickoff that
    // shifts the instant) and take BOTH their result AND their kickoff from it:
    // FD's free tier mis-times delayed knockouts (it kept Mexico–Ecuador an hour
    // early), which corrupts the prediction lock and the LIVE window, not just
    // the score. Group rows never touch ESPN.
    const pairKey = stage !== "GROUP" ? espnPairKey(homeCode, awayCode) : null
    const er = pairKey ? espnByPair.get(pairKey) : undefined

    const fixtureFields = {
      fd_id: m.id,
      // Knockout kickoff is ESPN's once we've linked the event (FD's can lag a
      // delay); FD's utcDate is the fallback — group rows, or before ESPN lists
      // the fixture / while its slot is an unresolved TBD.
      kickoff:
        er?.kickoffMs != null ? new Date(er.kickoffMs).toISOString() : m.utcDate,
      stage,
      group_name: m.group ? m.group.replace(/^(GROUP_|Group )/, "") : null,
      matchday: m.matchday ?? null,
      // Hold a knockout slot we've already resolved to a team when the feed
      // hands back null for it. Knockout slots fill one side at a time as groups
      // finish, and the free tier is laggy/cache-split — a slot it populated one
      // run can come back null the next (the same flip-flop class as the Uruguay
      // TLA). Writing that null straight through would blink the team out of the
      // bracket ("the qualified team appeared, then vanished"), so coalesce each
      // field: take the feed's value when present, else keep what we stored. A
      // genuine reassignment (team A → team B) still lands; only a regression to
      // null is held.
      home_team: m.homeTeam?.name ?? cur?.home_team ?? null,
      away_team: m.awayTeam?.name ?? cur?.away_team ?? null,
      // Pin the code to one canonical TLA so a team football-data serves under
      // two codes (Uruguay URU/URY) doesn't flip our stored value every sync and
      // make the team_form / in-tournament joins blink out (see canonicalTla).
      home_code: homeCode,
      away_code: awayCode,
      updated_at: new Date().toISOString(),
    }
    // Result fields by source:
    //  - admin-locked row → never touched (manual result stands);
    //  - knockout row → driven by ESPN only. FD's knockout score is unreliable:
    //    its free tier mangles penalty matches so badly that even stripping the
    //    shootout out of fullTime can't recover the 90'+ET score (Germany–Paraguay
    //    came back fullTime 5-6 / pens 5-5, which strips to a wrong 0-1, not 1-1).
    //    Hold the prior value when ESPN has nothing usable so we never write FD's
    //    bad score and never regress a recorded final;
    //  - group row → football-data, with the shootout stripped out of fullTime
    //    (a no-op in the group stage — see `result` above) and the existing
    //    scoreless/regression hold.
    let resultFields: Record<string, unknown> = {}
    if (lockedIds.has(ourId)) {
      resultFields = {}
    } else if (stage !== "GROUP") {
      const espnFinishedScoreless =
        er?.status === "FINISHED" && (er.homeScore == null || er.awayScore == null)
      const espnRegressing =
        er != null && er.status !== "FINISHED" && haveRecordedFinal
      if (er && !espnFinishedScoreless && !espnRegressing) {
        resultFields = {
          status: er.status,
          home_score: er.homeScore,
          away_score: er.awayScore,
          home_pens: er.homePens,
          away_pens: er.awayPens,
          duration: er.duration,
          // ESPN's live match clock for the card's elapsed-time display. Null
          // once the match isn't being clocked (full time clears it; the next
          // FINISHED sync writes null here).
          minute: er.minute,
        }
        espnKnockout++
      }
    } else if (!finishedButScoreless && !regressing) {
      resultFields = {
        status: m.status,
        home_score: result.home,
        away_score: result.away,
        home_pens: pens.home ?? null,
        away_pens: pens.away ?? null,
        duration: m.score?.duration ?? "REGULAR",
      }
    }

    const { error } = await db
      .from("matches")
      .update({ ...fixtureFields, ...resultFields })
      .eq("id", ourId)
    if (error) {
      failed++
      console.error(`match ${ourId} update failed:`, error.message)
    } else {
      updated++
    }
  }

  // Official group standings. football-data applies FIFA's fair-play tiebreaker
  // (and drawing of lots) that we can't compute from match results, so we store
  // its ordering verbatim and render that. Best-effort: a failure here leaves the
  // match results above intact, and the Groups tab falls back to a client table.
  let standings = 0
  try {
    const sres = await fetch(
      "https://api.football-data.org/v4/competitions/WC/standings",
      { headers: { "X-Auth-Token": token }, signal: AbortSignal.timeout(8000) }
    )
    if (sres.ok) {
      const { standings: tables } = (await sres.json()) as {
        standings: ApiStandingsTable[]
      }
      const now = new Date().toISOString()
      const upserts = tables
        .filter((t) => t.type === "TOTAL")
        .flatMap((t) =>
          t.table
            // Drop a team row missing core stats so a flaky/partial response
            // can't overwrite a good row with zeros.
            .filter((r) => r.playedGames != null && r.points != null)
            .map((r) => ({
              fd_team_id: r.team.id,
              group_name: (t.group ?? "").replace(/^(GROUP_|Group )/, ""),
              position: r.position,
              team_code: canonicalTla(r.team.tla ?? null),
              team_name: r.team.name ?? null,
              played: r.playedGames ?? 0,
              won: r.won ?? 0,
              drawn: r.draw ?? 0,
              lost: r.lost ?? 0,
              gf: r.goalsFor ?? 0,
              ga: r.goalsAgainst ?? 0,
              points: r.points ?? 0,
              updated_at: now,
            }))
        )
      if (upserts.length) {
        const { error } = await db
          .from("standings")
          .upsert(upserts, { onConflict: "fd_team_id" })
        if (!error) standings = upserts.length
      }
    }
  } catch {
    // Standings are layered on top of match results; never fail the sync for them.
  }

  // Unlock the next knockout round from our own results: fill each slot whose
  // two feeders have been final for the settle window (see 0016). Runs after the
  // result upserts above so a just-finalized feeder is visible, and is
  // best-effort — a failure here never fails the result sync.
  let unlocked = 0
  try {
    const { data, error } = await db.rpc("fill_ready_knockout_slots")
    if (!error && typeof data === "number") unlocked = data
  } catch {
    // Knockout slot-filling is layered on top of results; never fail for it.
  }

  return new Response(
    JSON.stringify({
      received: matches.length,
      updated,
      failed,
      unlinked,
      standings,
      espnFetched,
      espnKnockout,
      unlocked,
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  )
}

export const config: Config = {
  schedule: "*/2 * * * *",
}
