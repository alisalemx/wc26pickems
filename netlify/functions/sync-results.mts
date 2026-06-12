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
      return "GROUP"
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

  // This function is reachable over HTTP at /.netlify/functions/sync-results, so
  // throttle upstream calls to protect the football-data.org quota. The 10-min
  // cron never trips this; rapid manual/abusive hits return early without a fetch.
  const COOLDOWN_MS = 60_000
  const { data: lastRows } = await db
    .from("matches")
    .select("updated_at")
    .not("updated_at", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
  const lastSync = lastRows?.[0]?.updated_at
    ? new Date(lastRows[0].updated_at).getTime()
    : 0
  if (now.getTime() - lastSync < COOLDOWN_MS) {
    return new Response(JSON.stringify({ skipped: "recently synced" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }

  const res = await fetch(
    "https://api.football-data.org/v4/competitions/WC/matches",
    { headers: { "X-Auth-Token": token } }
  )
  if (!res.ok) {
    return new Response(`football-data error ${res.status}`, { status: 502 })
  }
  const { matches } = (await res.json()) as { matches: ApiMatch[] }

  // Load our rows once so we can link by fd_id, or by (stage + kickoff day)
  // for rows seeded statically that don't yet have an fd_id.
  const { data: rows, error: loadErr } = await db
    .from("matches")
    .select("id, fd_id, stage, kickoff, home_code, away_code, result_locked")
  if (loadErr) {
    return new Response(`db load error: ${loadErr.message}`, { status: 500 })
  }

  // Build a set of row ids whose results have been manually locked by an admin.
  // The sync skips result fields for these rows but keeps updating fixture metadata.
  const lockedIds = new Set<number>(
    (rows ?? [])
      .filter((r) => r.result_locked)
      .map((r) => r.id as number)
  )

  const apiLite: ApiMatchLite[] = matches.map((m) => ({
    fdId: m.id,
    stage: mapStage(m.stage),
    utcDate: m.utcDate,
    homeTla: m.homeTeam?.tla ?? null,
    awayTla: m.awayTeam?.tla ?? null,
  }))

  const links = linkMatches(rows ?? [], apiLite)

  let updated = 0
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

    // Fixture metadata is always reconciled. Result fields (status, scores,
    // pens, duration) are skipped when an admin has locked the row.
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
    const resultFields = lockedIds.has(ourId)
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
    if (!error) updated++
  }

  return new Response(
    JSON.stringify({ received: matches.length, updated, unlinked }),
    { status: 200, headers: { "content-type": "application/json" } }
  )
}

export const config: Config = {
  schedule: "*/10 * * * *",
}
