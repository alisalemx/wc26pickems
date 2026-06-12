import type { Config } from "@netlify/functions"
import { createClient } from "@supabase/supabase-js"

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
    .select("id, fd_id, stage, kickoff")
  if (loadErr) {
    return new Response(`db load error: ${loadErr.message}`, { status: 500 })
  }

  const byFd = new Map<number, number>() // fd_id -> our id
  const byStageDay = new Map<string, number>() // `${stage}|${yyyy-mm-dd}` -> our id
  for (const r of rows ?? []) {
    if (r.fd_id != null) byFd.set(Number(r.fd_id), r.id)
    const day = new Date(r.kickoff).toISOString().slice(0, 10)
    const key = `${r.stage}|${day}`
    if (!byStageDay.has(key)) byStageDay.set(key, r.id)
  }

  let updated = 0
  let linked = 0

  for (const m of matches) {
    const stage = mapStage(m.stage)
    let ourId = byFd.get(m.id)
    if (ourId == null) {
      // Fallback linker for static-seeded rows: match by stage + kickoff day.
      const day = m.utcDate.slice(0, 10)
      ourId = byStageDay.get(`${stage}|${day}`)
      if (ourId != null) linked++
    }
    if (ourId == null) continue

    const ft = m.score?.fullTime ?? { home: null, away: null }
    const pens = m.score?.penalties ?? { home: null, away: null }

    const { error } = await db
      .from("matches")
      .update({
        fd_id: m.id,
        status: m.status,
        kickoff: m.utcDate,
        stage,
        group_name: m.group ? m.group.replace(/^(GROUP_|Group )/, "") : null,
        matchday: m.matchday ?? null,
        home_team: m.homeTeam?.name ?? null,
        away_team: m.awayTeam?.name ?? null,
        home_code: m.homeTeam?.tla ?? null,
        away_code: m.awayTeam?.tla ?? null,
        home_score: ft.home,
        away_score: ft.away,
        home_pens: pens.home ?? null,
        away_pens: pens.away ?? null,
        duration: m.score?.duration ?? "REGULAR",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ourId)
    if (!error) updated++
  }

  return new Response(
    JSON.stringify({ received: matches.length, updated, linked }),
    { status: 200, headers: { "content-type": "application/json" } }
  )
}

export const config: Config = {
  schedule: "*/10 * * * *",
}
