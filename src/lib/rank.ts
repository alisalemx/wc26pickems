export interface Rankable {
  total_points: number
  exact_count: number
  outcome_count: number
  scored_count: number
}

/** Standard competition ranking ("1224") over an already-sorted leaderboard:
 *  a row tied with the previous row on all four criteria shares its rank;
 *  otherwise its rank is its 1-based position. (scored_count is the
 *  fewest-misses tie-breaker — with the first three tied, fewer scored
 *  predictions means fewer misses; the query sorts it ascending.) */
export function competitionRanks(rows: Rankable[]): number[] {
  const ranks: number[] = []
  for (let i = 0; i < rows.length; i++) {
    if (i === 0) {
      ranks.push(1)
      continue
    }
    const prev = rows[i - 1]
    const curr = rows[i]
    const tied =
      curr.total_points === prev.total_points &&
      curr.exact_count === prev.exact_count &&
      curr.outcome_count === prev.outcome_count &&
      curr.scored_count === prev.scored_count
    ranks.push(tied ? ranks[i - 1] : i + 1)
  }
  return ranks
}
