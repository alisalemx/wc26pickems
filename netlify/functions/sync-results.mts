import type { Config } from "@netlify/functions"
import { createClient } from "@supabase/supabase-js"
import { linkMatches } from "../lib/link-matches.mts"
import type { ApiMatchLite } from "../lib/link-matches.mts"

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

export default async () => {
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
      "id, fd_id, stage, kickoff, home_code, away_code, result_locked, status, home_score, away_score, updated_at"
    )
  if (loadErr) {
    return new Response(`db load error: ${loadErr.message}`, { status: 500 })
  }
  const ourRows = rows ?? []

  // Throttle upstream calls to protect the football-data.org quota. This
  // function is reachable over HTTP at /.netlify/functions/sync-results; the
  // 2-min cron clears this 60s window so every scheduled run fetches (≈1
  // req/min, well under the free tier), while rapid manual/abusive hits return
  // early.
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

  let updated = 0
  let failed = 0
  let unlinked = 0

  for (const m of matches) {
    const stage = mapStage(m.stage)
    const ourId = links.get(m.id)
    if (ourId == null) {
      unlinked++
      continue
    }

    const ft = m.score?.fullTime ?? { home: null, away: null }
    const pens = m.score?.penalties ?? { home: null, away: null }

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
    const holdResult =
      lockedIds.has(ourId) || finishedButScoreless || regressing

    const fixtureFields = {
      fd_id: m.id,
      kickoff: m.utcDate,
      stage,
      group_name: m.group ? m.group.replace(/^(GROUP_|Group )/, "") : null,
      matchday: m.matchday ?? null,
      home_team: m.homeTeam?.name ?? null,
      away_team: m.awayTeam?.name ?? null,
      home_code: m.homeTeam?.tla ?? null,
      away_code: m.awayTeam?.tla ?? null,
      updated_at: new Date().toISOString(),
    }
    const resultFields =
      holdResult
        ? {}
        : {
            status: m.status,
            home_score: ft.home,
            away_score: ft.away,
            home_pens: pens.home ?? null,
            away_pens: pens.away ?? null,
            duration: m.score?.duration ?? "REGULAR",
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
              team_code: r.team.tla ?? null,
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

  return new Response(
    JSON.stringify({ received: matches.length, updated, failed, unlinked, standings }),
    { status: 200, headers: { "content-type": "application/json" } }
  )
}

export const config: Config = {
  schedule: "*/2 * * * *",
}
