/**
 * Seeds the `matches` table with all 104 fixtures.
 *
 * Two modes:
 *   1. Static (default): reads scripts/data/matches-2026.json (committed).
 *        npx tsx scripts/seed-matches.ts
 *   2. Live API: fetches the official schedule from football-data.org, which
 *      yields real kickoff times + fd_ids (recommended once you have a token).
 *        SEED_SOURCE=api FOOTBALL_DATA_TOKEN=xxx npx tsx scripts/seed-matches.ts
 *
 * Requires (both modes write to Supabase with the service role key):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Run from your own machine — the football-data.org host is not reachable from
 * every CI/sandbox network.
 */
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"
import { mapApiStage, type MatchUpsert } from "./fd-shared"

const __dirname = dirname(fileURLToPath(import.meta.url))

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var ${name}`)
  return v
}

function fromJson(): MatchUpsert[] {
  const path = resolve(__dirname, "data", "matches-2026.json")
  const rows = JSON.parse(readFileSync(path, "utf8")) as MatchUpsert[]
  return rows
}

async function fromApi(): Promise<MatchUpsert[]> {
  const token = requireEnv("FOOTBALL_DATA_TOKEN")
  const res = await fetch(
    "https://api.football-data.org/v4/competitions/WC/matches",
    { headers: { "X-Auth-Token": token } }
  )
  if (!res.ok) {
    throw new Error(`football-data.org error ${res.status}: ${await res.text()}`)
  }
  const data = (await res.json()) as { matches: ApiMatch[] }
  // Sort chronologically and number 1..N within group / knockout blocks.
  const sorted = [...data.matches].sort(
    (a, b) => +new Date(a.utcDate) - +new Date(b.utcDate)
  )
  let groupId = 0
  let koId = 72
  return sorted.map((m): MatchUpsert => {
    const stage = mapApiStage(m.stage)
    const id = stage === "GROUP" ? ++groupId : ++koId
    return {
      id,
      fd_id: m.id,
      stage,
      group_name: m.group ? m.group.replace(/^(GROUP_|Group )/, "") : null,
      matchday: m.matchday ?? null,
      home_team: m.homeTeam?.name ?? null,
      away_team: m.awayTeam?.name ?? null,
      home_code: m.homeTeam?.tla ?? null,
      away_code: m.awayTeam?.tla ?? null,
      kickoff: m.utcDate,
      venue: null,
      status: m.status ?? "TIMED",
    }
  })
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
}

async function main() {
  const source = (process.env.SEED_SOURCE ?? "json").toLowerCase()
  const rows = source === "api" ? await fromApi() : fromJson()

  if (rows.length !== 104) {
    console.warn(`Warning: expected 104 matches, got ${rows.length}`)
  }

  const db = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  )

  const { error } = await db
    .from("matches")
    .upsert(rows, { onConflict: "id" })
  if (error) throw error

  const groups = rows.filter((r) => r.stage === "GROUP").length
  console.log(
    `Seeded ${rows.length} matches from ${source} (${groups} group, ${
      rows.length - groups
    } knockout).`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
