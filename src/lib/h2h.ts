/** Head-to-head history helpers for the two-team Compare modal (knockout
 *  matches only — see 0017_head_to_head.sql and TeamInfoDialog.tsx). Pure and
 *  unit-tested (h2h.test.ts). */

/** One past meeting between two teams (competitive or friendly), as stored in
 *  `head_to_head.meetings` jsonb, newest first. Pens are display-only — a
 *  shootout result never affects the W/D/L tally, matching how the app scores
 *  (see "Scoring" in CLAUDE.md). */
export interface H2hMeeting {
  date: string
  competition: string
  home: string
  away: string
  home_score: number
  away_score: number
  home_pens?: number | null
  away_pens?: number | null
}

/** Canonical, order-independent key for a pair of football-data TLAs — two
 *  codes sorted alphabetically and joined by "-" (e.g. "ARG"+"SUI" -> "ARG-SUI"). */
export function pairKey(a: string, b: string): string {
  return [a, b].sort().join("-")
}

/** One meeting re-expressed from a single team's perspective, ready for a
 *  ResultRow-style row: W/D/L outcome (a shootout counts as a draw), goals
 *  for/against, with the date and competition passed through. */
export interface H2hPerspectiveRow {
  date: string
  competition: string
  gf: number
  ga: number
  outcome: "W" | "D" | "L"
}

/** Re-expresses each meeting from `code`'s perspective. The outcome is judged
 *  on home_score/away_score only — a shootout counts as a draw (pens never
 *  affect W/D/L, matching how the app scores). Meeting order is preserved. */
export function perspectiveMeetings(
  meetings: H2hMeeting[],
  code: string
): H2hPerspectiveRow[] {
  return meetings.map((m) => {
    const isHome = m.home === code
    const gf = isHome ? m.home_score : m.away_score
    const ga = isHome ? m.away_score : m.home_score
    return {
      date: m.date,
      competition: m.competition,
      gf,
      ga,
      outcome: gf > ga ? "W" : gf < ga ? "L" : "D",
    }
  })
}

/** Tally of a `codeA`-relative W/D/L across a list of meetings, judged on
 *  home_score/away_score only — a penalty shootout always counts as a draw,
 *  never affecting the W/D/L tally (pens are display-only, like scoring). */
export function summarizeMeetings(
  meetings: H2hMeeting[],
  codeA: string
): { winsA: number; draws: number; winsB: number } {
  let winsA = 0
  let draws = 0
  let winsB = 0
  for (const m of meetings) {
    if (m.home_score === m.away_score) {
      draws++
      continue
    }
    const homeWon = m.home_score > m.away_score
    const winnerIsA = homeWon ? m.home === codeA : m.away === codeA
    if (winnerIsA) winsA++
    else winsB++
  }
  return { winsA, draws, winsB }
}
