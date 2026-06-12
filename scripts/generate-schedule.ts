/**
 * Generates a structurally-complete 104-match schedule for the 2026 World Cup
 * and writes it to scripts/data/matches-2026.json. No network required.
 *
 * Run: npx tsx scripts/generate-schedule.ts
 *
 * This static schedule is the committed fallback used to seed the database so
 * the app works immediately. Exact kickoff times / knockout participants are
 * reconciled later by the Netlify sync function against football-data.org.
 */
import { writeFileSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { GROUPS, HOST_CITIES } from "./teams"

type Stage = "GROUP" | "R32" | "R16" | "QF" | "SF" | "THIRD" | "FINAL"

interface SeedMatch {
  id: number
  fd_id: number | null
  stage: Stage
  group_name: string | null
  matchday: number | null
  home_team: string | null
  away_team: string | null
  home_code: string | null
  away_code: string | null
  kickoff: string
  venue: string | null
  status: string
}

const __dirname = dirname(fileURLToPath(import.meta.url))

// Round-robin pairings (0-indexed) for a group of four, by matchday.
const RR: [number, number][][] = [
  [
    [0, 1],
    [2, 3],
  ],
  [
    [0, 2],
    [3, 1],
  ],
  [
    [3, 0],
    [1, 2],
  ],
]

function isoUTC(day: string, hour: number): string {
  return new Date(`${day}T${String(hour).padStart(2, "0")}:00:00Z`).toISOString()
}

function dateStr(base: string, addDays: number): string {
  const d = new Date(`${base}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + addDays)
  return d.toISOString().slice(0, 10)
}

const matches: SeedMatch[] = []
let id = 0
let venueIdx = 0
const nextVenue = () => HOST_CITIES[venueIdx++ % HOST_CITIES.length]

// ---- Group stage: 72 matches (12 groups × 3 matchdays × 2 games) ----
const groupLetters = Object.keys(GROUPS) // A..L
const MD_START = ["2026-06-11", "2026-06-17", "2026-06-23"] // MD1, MD2, MD3

for (let md = 0; md < 3; md++) {
  groupLetters.forEach((letter, gIdx) => {
    const teams = GROUPS[letter]
    const day = dateStr(MD_START[md], Math.floor(gIdx / 2))
    RR[md].forEach(([h, a], slot) => {
      id++
      matches.push({
        id,
        fd_id: null,
        stage: "GROUP",
        group_name: letter,
        matchday: md + 1,
        home_team: teams[h].name,
        away_team: teams[a].name,
        home_code: teams[h].code,
        away_code: teams[a].code,
        kickoff: isoUTC(day, slot === 0 ? 17 : 20),
        venue: nextVenue(),
        status: "TIMED",
      })
    })
  })
}

// ---- Knockouts: 32 matches, participants TBD (filled by sync) ----
interface KO {
  stage: Stage
  count: number
  startDay: string
  perDay: number
}
const knockout: KO[] = [
  { stage: "R32", count: 16, startDay: "2026-06-28", perDay: 3 },
  { stage: "R16", count: 8, startDay: "2026-07-04", perDay: 2 },
  { stage: "QF", count: 4, startDay: "2026-07-09", perDay: 2 },
  { stage: "SF", count: 2, startDay: "2026-07-14", perDay: 1 },
  { stage: "THIRD", count: 1, startDay: "2026-07-18", perDay: 1 },
  { stage: "FINAL", count: 1, startDay: "2026-07-19", perDay: 1 },
]

for (const ko of knockout) {
  for (let i = 0; i < ko.count; i++) {
    id++
    const day = dateStr(ko.startDay, Math.floor(i / ko.perDay))
    const hour = 16 + (i % ko.perDay) * 3
    matches.push({
      id,
      fd_id: null,
      stage: ko.stage,
      group_name: null,
      matchday: null,
      home_team: null,
      away_team: null,
      home_code: null,
      away_code: null,
      kickoff: isoUTC(day, hour),
      venue: nextVenue(),
      status: "TIMED",
    })
  }
}

if (matches.length !== 104) {
  throw new Error(`Expected 104 matches, generated ${matches.length}`)
}

const outPath = resolve(__dirname, "data", "matches-2026.json")
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(matches, null, 2) + "\n")

const groupCount = matches.filter((m) => m.stage === "GROUP").length
console.log(
  `Wrote ${matches.length} matches (${groupCount} group, ${
    matches.length - groupCount
  } knockout) to ${outPath}`
)
