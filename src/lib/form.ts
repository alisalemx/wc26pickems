import type { MatchRow } from "./types"

/** Each team's in-tournament W/D/L, computed from our own `matches` table —
 *  no external API needed (the pre-tournament snapshot in `team_form` is the
 *  separate, frozen half). Keyed by team code, ordered oldest -> newest by
 *  kickoff. Group-stage draws are D; a knockout level after 90'+ET that's
 *  decided on penalties counts as W/L for the shootout winner. */
export function computeTournamentForm(
  matches: MatchRow[]
): Record<string, string> {
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

  const byCode: Record<string, string> = {}
  for (const m of finished) {
    const hs = m.home_score as number
    const as = m.away_score as number

    let home: "W" | "D" | "L"
    if (hs > as) home = "W"
    else if (hs < as) home = "L"
    else if (m.home_pens != null && m.away_pens != null)
      home = m.home_pens > m.away_pens ? "W" : m.home_pens < m.away_pens ? "L" : "D"
    else home = "D"
    const away = home === "W" ? "L" : home === "L" ? "W" : "D"

    const hc = m.home_code as string
    const ac = m.away_code as string
    byCode[hc] = (byCode[hc] ?? "") + home
    byCode[ac] = (byCode[ac] ?? "") + away
  }
  return byCode
}
