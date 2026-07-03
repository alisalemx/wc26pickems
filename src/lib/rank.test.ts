import { describe, it, expect } from "vitest"
import { competitionRanks, type Rankable } from "./rank"

function row(
  total_points: number,
  exact_count: number,
  outcome_count: number,
  scored_count = exact_count + outcome_count
): Rankable {
  return { total_points, exact_count, outcome_count, scored_count }
}

describe("competitionRanks", () => {
  it("returns 1,2,3 when no rows are tied", () => {
    const rows = [row(10, 3, 1), row(8, 2, 2), row(5, 1, 1)]
    expect(competitionRanks(rows)).toEqual([1, 2, 3])
  })

  it("a tied pair shares a rank, and the next row skips to its position", () => {
    const rows = [row(10, 3, 1), row(10, 3, 1), row(5, 1, 1)]
    expect(competitionRanks(rows)).toEqual([1, 1, 3])
  })

  it("a tie broken only by outcome_count gets distinct ranks", () => {
    const rows = [row(10, 3, 2), row(10, 3, 1)]
    expect(competitionRanks(rows)).toEqual([1, 2])
  })

  it("a tie broken only by scored_count (fewest misses) gets distinct ranks", () => {
    // Same points/exacts/outcomes, but the second player missed on two extra
    // scored predictions — the query sorts them behind, and they rank behind.
    const rows = [row(10, 3, 1, 4), row(10, 3, 1, 6)]
    expect(competitionRanks(rows)).toEqual([1, 2])
  })

  it("returns an empty array for an empty leaderboard", () => {
    expect(competitionRanks([])).toEqual([])
  })

  it("a three-way full tie at the top shares rank 1, next row is 4th", () => {
    const rows = [row(10, 3, 1), row(10, 3, 1), row(10, 3, 1), row(5, 1, 1)]
    expect(competitionRanks(rows)).toEqual([1, 1, 1, 4])
  })
})
