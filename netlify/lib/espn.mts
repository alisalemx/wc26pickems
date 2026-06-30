// ESPN's free, keyless scoreboard feed, used as the result source for the
// **knockout stage only** (group results + official standings stay on
// football-data — see sync-results.mts). football-data's free tier serves a
// corrupt `score.fullTime` for penalty-shootout matches (e.g. Germany–Paraguay
// R32 came back 5-6 with a null winner and 5-5 pens, when it finished 1-1 and
// Paraguay won 4-3 on penalties). ESPN reports the clean post-ET score in
// `competitor.score` and the shootout in `competitor.shootoutScore`, which is
// exactly the 90'+ET / penalty split our schema stores.
//
// The endpoint is undocumented and ToS-gray, so this module is deliberately
// defensive: malformed events are skipped, and the sync treats a missing/failed
// ESPN result as "hold the prior value" rather than ever writing FD's bad score.

/** A single ESPN scoreboard event, narrowed to the fields we read. */
interface EspnCompetitor {
  homeAway?: string
  score?: string | number | null
  shootoutScore?: number | null
}
interface EspnStatusType {
  state?: string // "pre" | "in" | "post"
  name?: string // e.g. STATUS_SCHEDULED, STATUS_FULL_TIME, STATUS_FINAL_PEN
  completed?: boolean
}
interface EspnStatus {
  type?: EspnStatusType
  displayClock?: string // e.g. "67'", "45'+2'", "90'+3'"
}
interface EspnCompetition {
  date?: string
  status?: EspnStatus
  competitors?: EspnCompetitor[]
}
interface EspnEvent {
  competitions?: EspnCompetition[]
}
export interface EspnScoreboard {
  events?: EspnEvent[]
}

/** A knockout result keyed to its kickoff instant, in our own vocabulary —
 *  scores/pens already split the way the schema stores them. */
export interface EspnResult {
  kickoffMs: number
  status: string // mapped to our matches.status vocabulary
  duration: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT"
  homeScore: number | null
  awayScore: number | null
  homePens: number | null
  awayPens: number | null
  /** ESPN's formatted match clock while the match is underway ("67'", "HT",
   *  "45'+2'"), for the live-minute display. Null once it's not actively
   *  clocked (pre-match / full time). */
  minute: string | null
}

/** Map ESPN's status to the football-data vocabulary our app uses everywhere
 *  (scored_predictions gates on status='FINISHED'; the bracket reads FINISHED
 *  too). `completed` is the authoritative "this match is decided" flag. */
export function mapEspnStatus(
  state: string | undefined,
  name: string | undefined,
  completed: boolean | undefined
): string {
  if (state === "post") return completed ? "FINISHED" : "IN_PLAY"
  if (state === "in") return name === "STATUS_HALFTIME" ? "PAUSED" : "IN_PLAY"
  return "TIMED" // "pre" / unknown — not started
}

/** Decide the match duration for display (only PENALTY_SHOOTOUT gates the pens
 *  UI; EXTRA_TIME vs REGULAR never affects scoring, so it's best-effort). */
export function espnDuration(
  name: string | undefined,
  hasPens: boolean
): EspnResult["duration"] {
  if (hasPens || name === "STATUS_FINAL_PEN") return "PENALTY_SHOOTOUT"
  const n = name ?? ""
  if (n.includes("AET") || n.includes("EXTRA") || n.includes("OVERTIME"))
    return "EXTRA_TIME"
  return "REGULAR"
}

/** The live match clock to display, from ESPN's status. Only meaningful while
 *  the match is actually being clocked (state "in"): halftime collapses to "HT"
 *  (ESPN freezes the clock there), and otherwise we pass ESPN's own formatted
 *  `displayClock` ("67'", "45'+2'") straight through — but only if it carries a
 *  digit, so a blank/"-" placeholder becomes null and the client falls back to
 *  its wall-clock estimate. Null for pre-match and full time. */
export function espnMinute(
  status: EspnStatus | undefined,
  state: string | undefined
): string | null {
  if (state !== "in") return null
  if (status?.type?.name === "STATUS_HALFTIME") return "HT"
  const clock = status?.displayClock?.trim()
  return clock && /\d/.test(clock) ? clock : null
}

function toIntOrNull(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null
  const n = typeof v === "number" ? v : parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

/** Parse an ESPN scoreboard payload into our result shape. Skips any event
 *  missing a parseable kickoff or both competitors. */
export function parseEspnScoreboard(body: EspnScoreboard | null): EspnResult[] {
  const out: EspnResult[] = []
  for (const e of body?.events ?? []) {
    const comp = e.competitions?.[0]
    if (!comp) continue
    const ms = comp.date ? new Date(comp.date).getTime() : NaN
    if (!Number.isFinite(ms)) continue
    const home = comp.competitors?.find((c) => c.homeAway === "home")
    const away = comp.competitors?.find((c) => c.homeAway === "away")
    if (!home || !away) continue

    const st = comp.status?.type
    const status = mapEspnStatus(st?.state, st?.name, st?.completed)
    // Scores are only meaningful once the match is underway; ESPN reports "0"
    // for scheduled fixtures, which we must not store as a real 0-0.
    const started = st?.state === "in" || st?.state === "post"
    const homePens = toIntOrNull(home.shootoutScore)
    const awayPens = toIntOrNull(away.shootoutScore)
    const hasPens = homePens != null || awayPens != null

    out.push({
      kickoffMs: ms,
      status,
      duration: espnDuration(st?.name, hasPens),
      homeScore: started ? toIntOrNull(home.score) : null,
      awayScore: started ? toIntOrNull(away.score) : null,
      homePens,
      awayPens,
      minute: espnMinute(comp.status, st?.state),
    })
  }
  return out
}

/** Index results by kickoff-instant epoch ms — the unambiguous join key to our
 *  knockout rows (no two knockout matches share a kickoff instant). */
export function indexEspnByInstant(results: EspnResult[]): Map<number, EspnResult> {
  return new Map(results.map((r) => [r.kickoffMs, r]))
}
