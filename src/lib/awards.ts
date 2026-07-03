import type { LeaderboardRow, ScoredPredictionRow } from "./types"

/** Sharpshooter: the player(s) with the most EXACT results (`exact_count` on
 *  the leaderboard row). Ties are listed together. Empty input -> empty. */
export function pickSharpshooters(rows: LeaderboardRow[]): LeaderboardRow[] {
  if (rows.length === 0) return []
  const max = Math.max(...rows.map((r) => r.exact_count))
  if (max <= 0) return []
  return rows.filter((r) => r.exact_count === max)
}

/** Ever-present: the player(s) with the most scored predictions
 *  (`scored_count`). Ties are listed together. Empty input -> empty. */
export function pickEverPresent(rows: LeaderboardRow[]): LeaderboardRow[] {
  if (rows.length === 0) return []
  const max = Math.max(...rows.map((r) => r.scored_count))
  if (max <= 0) return []
  return rows.filter((r) => r.scored_count === max)
}

/** A scored prediction row known to belong to an EXACT-result match, joined
 *  with the player's username (the scored_predictions view carries no
 *  username, so the caller joins it from the leaderboard). */
export interface NamedExactCall extends ScoredPredictionRow {
  username: string
}

/** Best single call: across every player, the highest-points EXACT result.
 *  Ties break on the earlier kickoff (the bolder early call). Rows that
 *  aren't EXACT are ignored; a row missing `points` is treated as not a
 *  candidate. Null when there are no EXACT rows. */
export function pickBestSingleCall(
  rows: NamedExactCall[]
): NamedExactCall | null {
  let best: NamedExactCall | null = null
  for (const row of rows) {
    if (row.result_type !== "EXACT" || row.points == null) continue
    if (
      !best ||
      row.points > best.points! ||
      (row.points === best.points! &&
        new Date(row.kickoff) < new Date(best.kickoff))
    ) {
      best = row
    }
  }
  return best
}
