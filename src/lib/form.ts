import type { MatchRow, MatchStage } from "./types"

export type Outcome = "W" | "D" | "L"

/** One finished tournament match from a team's perspective. */
export interface TournamentResult {
  matchId: number
  date: string
  stage: MatchStage
  opponent: string | null
  opponentCode: string | null
  gf: number
  ga: number
  outcome: Outcome
}

/** Each team's finished World Cup matches, keyed by team code, oldest -> newest
 *  by kickoff. Computed from our own `matches` table — no external API (the
 *  pre-tournament snapshot in `team_form` is the separate, static half).
 *  Group-stage draws are D; a knockout level after 90'+ET that's decided on
 *  penalties counts as W/L for the shootout winner. */
export function computeTournamentResults(
  matches: MatchRow[]
): Record<string, TournamentResult[]> {
  const finished = matches
    .filter(
      (m) =>
        m.status === "FINISHED" &&
        m.home_score != null &&
        m.away_score != null &&
        m.home_code != null &&
        m.away_code != null
    )
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())

  const byCode: Record<string, TournamentResult[]> = {}
  for (const m of finished) {
    const hs = m.home_score as number
    const as = m.away_score as number

    let home: Outcome
    if (hs > as) home = "W"
    else if (hs < as) home = "L"
    else if (m.home_pens != null && m.away_pens != null)
      home = m.home_pens > m.away_pens ? "W" : m.home_pens < m.away_pens ? "L" : "D"
    else home = "D"
    const away: Outcome = home === "W" ? "L" : home === "L" ? "W" : "D"

    const hc = m.home_code as string
    const ac = m.away_code as string
    ;(byCode[hc] ??= []).push({
      matchId: m.id,
      date: m.kickoff,
      stage: m.stage,
      opponent: m.away_team,
      opponentCode: m.away_code,
      gf: hs,
      ga: as,
      outcome: home,
    })
    ;(byCode[ac] ??= []).push({
      matchId: m.id,
      date: m.kickoff,
      stage: m.stage,
      opponent: m.home_team,
      opponentCode: m.home_code,
      gf: as,
      ga: hs,
      outcome: away,
    })
  }
  return byCode
}

/** Each team's not-yet-played World Cup matches (kickoff still in the future),
 *  keyed by team code, oldest -> newest by kickoff. Returns the full match rows
 *  so the modal can reuse the same MatchCard as the matches tab. Knockout
 *  fixtures whose teams aren't decided yet have null codes and simply don't
 *  attach to any team until the bracket resolves. */
export function computeUpcomingMatches(
  matches: MatchRow[],
  now: number = Date.now()
): Record<string, MatchRow[]> {
  const upcoming = matches
    .filter((m) => new Date(m.kickoff).getTime() > now)
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())

  const byCode: Record<string, MatchRow[]> = {}
  for (const m of upcoming) {
    if (m.home_code) (byCode[m.home_code] ??= []).push(m)
    if (m.away_code) (byCode[m.away_code] ??= []).push(m)
  }
  return byCode
}

/** Each team's in-tournament W/D/L string (oldest -> newest), keyed by team
 *  code. Thin projection of computeTournamentResults for the form chips. */
export function computeTournamentForm(
  matches: MatchRow[]
): Record<string, string> {
  const results = computeTournamentResults(matches)
  const out: Record<string, string> = {}
  for (const code in results) {
    out[code] = results[code].map((r) => r.outcome).join("")
  }
  return out
}
