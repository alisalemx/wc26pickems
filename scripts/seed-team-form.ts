/**
 * Seeds the `team_form` table with each nation's FROZEN pre-tournament form —
 * their last 5 senior internationals before the 2026 World Cup kicked off —
 * from the committed static dataset scripts/data/pre-tournament-form.json.
 *
 * This is deliberately static: those matches are all in the past and never
 * change, so there is no live sync (football-data.org's free tier has no
 * out-of-tournament national-team matches, and API-Football's free tier blocks
 * current seasons). In-tournament form is computed separately from `matches`.
 *
 * Run once (needs the service role — both write to Supabase):
 *   npm run seed-team-form        # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"
import { GROUPS } from "./teams"

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")
  process.exit(1)
}

interface FormMatch {
  date: string
  opponent: string
  gf: number
  ga: number
  outcome: "W" | "D" | "L"
  competition: string
}
interface FormEntry {
  form: string
  results?: FormMatch[]
}
interface Honor {
  competition: string
  count: number
  years: number[]
}

const here = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(
  readFileSync(resolve(here, "data/pre-tournament-form.json"), "utf8")
) as Record<string, FormEntry>
// Honours live in a separate file (keyed by the same code; a `_notes` key holds
// provenance and is ignored here).
const honorsData = JSON.parse(
  readFileSync(resolve(here, "data/honors.json"), "utf8")
) as Record<string, { honors?: Honor[] }>

const nameByCode = new Map(
  Object.values(GROUPS)
    .flat()
    .map((t) => [t.code, t.name])
)

const rows = Object.entries(data).map(([code, entry]) => ({
  code,
  name: nameByCode.get(code) ?? null,
  form: entry.form,
  results: entry.results ?? null,
  honors: honorsData[code]?.honors ?? null,
  updated_at: new Date().toISOString(),
}))

const db = createClient(url, key, { auth: { persistSession: false } })

// Remove any rows no longer in the dataset (e.g. illustrative teams that did
// not actually qualify) so team_form mirrors the committed JSON exactly. Codes
// are 3-letter uppercase, safe to inline unquoted in the PostgREST `in` list.
const codes = rows.map((r) => r.code)
const { error: delErr } = await db
  .from("team_form")
  .delete()
  .not("code", "in", `(${codes.join(",")})`)
if (delErr) {
  console.error("Cleanup failed:", delErr.message)
  process.exit(1)
}

const { error } = await db.from("team_form").upsert(rows, { onConflict: "code" })
if (error) {
  console.error("Upsert failed:", error.message)
  process.exit(1)
}
console.log(`Seeded ${rows.length} teams into team_form (stale rows removed).`)
