/**
 * Seeds the `head_to_head` table with each team pair's meeting history
 * (last 15 years, competitive + friendly) from the committed static dataset
 * scripts/data/head-to-head.json. Shown for knockout matches only, but the
 * gate is in the client — the data is just all meetings per pair.
 *
 * This is deliberately static, same idiom as seed-team-form.ts: no free API
 * carries historical head-to-head results, so the data was researched once
 * and committed, then loaded here. No live sync.
 *
 * Run once (needs the service role):
 *   npm run seed-h2h        # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")
  process.exit(1)
}

interface Meeting {
  date: string
  competition: string
  home: string
  away: string
  home_score: number
  away_score: number
  home_pens?: number | null
  away_pens?: number | null
}
interface PairEntry {
  meetings: Meeting[]
}

const here = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(
  readFileSync(resolve(here, "data/head-to-head.json"), "utf8")
) as Record<string, PairEntry>

// Keys starting with "_" (e.g. the "_notes" provenance line) are metadata,
// not pairs — same convention as honors.json.
const rows = Object.entries(data)
  .filter(([pairKey]) => !pairKey.startsWith("_"))
  .map(([pairKey, entry]) => ({
    pair_key: pairKey,
    meetings: entry.meetings ?? [],
    updated_at: new Date().toISOString(),
  }))

const db = createClient(url, key, { auth: { persistSession: false } })

// Remove any rows no longer in the dataset so head_to_head mirrors the
// committed JSON exactly. Keys are validated first (safety check before
// inlining unquoted into the PostgREST `in` list, and to avoid a `not in ()`
// that would wipe every row on an empty list).
const keys = rows.map((r) => r.pair_key)
const badKeys = keys.filter((k) => !/^[A-Z]{3}-[A-Z]{3}$/.test(k))
if (badKeys.length > 0) {
  console.error(`Invalid pair keys (expected ^[A-Z]{3}-[A-Z]{3}$): ${badKeys.join(", ")}`)
  process.exit(1)
}
if (keys.length === 0) {
  console.error("No pair keys in the dataset; aborting to avoid wiping head_to_head.")
  process.exit(1)
}
const { error: delErr } = await db
  .from("head_to_head")
  .delete()
  .not("pair_key", "in", `(${keys.join(",")})`)
if (delErr) {
  console.error("Cleanup failed:", delErr.message)
  process.exit(1)
}

const { error } = await db.from("head_to_head").upsert(rows, { onConflict: "pair_key" })
if (error) {
  console.error("Upsert failed:", error.message)
  process.exit(1)
}
console.log(`Seeded ${rows.length} pairs into head_to_head (stale rows removed).`)
