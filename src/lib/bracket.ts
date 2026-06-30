import type { MatchRow } from "./types"

/** Knockout bracket linkage for 2026, by official match number (matches.id).
 *  Each later match is fed by its two feeder matches' WINNERS. This is fixed by
 *  the schedule regardless of which teams qualify, and isn't stored in our
 *  fixture data (knockout rows carry only stage/kickoff), so it's encoded here.
 *  The third-place play-off (103) is fed by the SF losers and sits outside this
 *  winners' tree — it's handled separately. Source: FIFA 2026 match schedule. */
export const FEEDERS: Record<number, [number, number]> = {
  104: [101, 102], // Final
  101: [97, 98], // Semi-finals
  102: [99, 100],
  97: [89, 90], // Quarter-finals
  98: [93, 94],
  99: [91, 92],
  100: [95, 96],
  89: [74, 77], // Round of 16
  90: [73, 75],
  91: [76, 78],
  92: [79, 80],
  93: [83, 84],
  94: [81, 82],
  95: [86, 88],
  96: [85, 87],
}

export const FINAL_ID = 104
export const THIRD_ID = 103

/** The third-place play-off (103) sits outside the winners' tree: it's contested
 *  by the two semi-final LOSERS (matches 101, 102), so it resolves from feeder
 *  losers rather than winners. */
export const THIRD_FEEDERS: [number, number] = [101, 102]

/** Which side won, judged on 90'+ET first and the shootout only as a decider —
 *  the same rule scoring uses for outcomes (pens are display-only there, but
 *  here they legitimately decide who advances). Null while unfinished or level. */
export function winnerSide(m: MatchRow): "home" | "away" | null {
  if (m.status !== "FINISHED" || m.home_score == null || m.away_score == null)
    return null
  if (m.home_score > m.away_score) return "home"
  if (m.away_score > m.home_score) return "away"
  if (m.home_pens != null && m.away_pens != null) {
    if (m.home_pens > m.away_pens) return "home"
    if (m.away_pens > m.home_pens) return "away"
  }
  return null
}

/** The (name, code) of one side of a match. */
function sideTeam(m: MatchRow, side: "home" | "away") {
  return side === "home"
    ? { team: m.home_team, code: m.home_code }
    : { team: m.away_team, code: m.away_code }
}

/** Resolve the team a feeder match sends onward: its winner (winners' tree) or
 *  its loser (third-place play-off). Null until that feeder is decided. */
function feederTeam(
  byId: Map<number, MatchRow>,
  feederId: number,
  which: "winner" | "loser"
) {
  const m = byId.get(feederId)
  if (!m) return null
  const w = winnerSide(m)
  if (!w) return null
  const side = which === "winner" ? w : w === "home" ? "away" : "home"
  return sideTeam(m, side)
}

/** Fill a knockout match's empty team slots from its feeders' decided results,
 *  so a round populates the instant the feeding matches finish rather than
 *  waiting for football-data to assign the slot upstream. Display-only: the
 *  stored row always wins when present (a real assignment overrides our
 *  derivation, including home/away orientation), and only a null side is filled.
 *  Resolves one level — a feeder that's FINISHED already carries its own teams —
 *  which cascades naturally as each round completes. Returns the row unchanged
 *  when nothing can (or needs to) be filled. */
export function resolveMatch(
  byId: Map<number, MatchRow>,
  id: number
): MatchRow | undefined {
  const m = byId.get(id)
  if (!m) return undefined
  const isThird = id === THIRD_ID
  const feeders = isThird ? THIRD_FEEDERS : FEEDERS[id]
  if (!feeders) return m
  const which = isThird ? "loser" : "winner"
  const home = m.home_team == null ? feederTeam(byId, feeders[0], which) : null
  const away = m.away_team == null ? feederTeam(byId, feeders[1], which) : null
  if (!home && !away) return m
  return {
    ...m,
    home_team: m.home_team ?? home?.team ?? null,
    home_code: m.home_code ?? home?.code ?? null,
    away_team: m.away_team ?? away?.team ?? null,
    away_code: m.away_code ?? away?.code ?? null,
  }
}

/** Return `matches` with every knockout row's empty team slots filled from its
 *  feeders' results (group rows pass through untouched). Lets the match list
 *  show a knockout fixture's teams the moment its feeders finish — the same
 *  client-side derivation the Bracket uses — instead of waiting for
 *  football-data to assign the slot upstream (which lags). Resolution is one
 *  level deep against the *stored* rows, which is all that's ever needed: a
 *  match can only be resolved once its feeders are FINISHED, and a FINISHED
 *  feeder already carries its own real teams, so each round fills in as it
 *  completes (matching the Bracket, which resolves the same stored map). */
export function resolveKnockoutTeams(matches: MatchRow[]): MatchRow[] {
  const byId = new Map<number, MatchRow>()
  for (const m of matches) if (m.stage !== "GROUP") byId.set(m.id, m)
  if (byId.size === 0) return matches
  return matches.map((m) =>
    m.stage === "GROUP" ? m : resolveMatch(byId, m.id) ?? m
  )
}
