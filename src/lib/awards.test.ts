import { describe, it, expect } from "vitest"
import {
  pickBestSingleCall,
  pickEverPresent,
  pickLeagueWinners,
  pickSharpshooters,
  type NamedExactCall,
} from "./awards"
import type { LeaderboardRow } from "./types"

function row(partial: Partial<LeaderboardRow>): LeaderboardRow {
  return {
    user_id: "u1",
    username: "player",
    total_points: 0,
    exact_count: 0,
    outcome_count: 0,
    scored_count: 0,
    ...partial,
  }
}

function call(partial: Partial<NamedExactCall>): NamedExactCall {
  return {
    user_id: "u1",
    username: "player",
    match_id: 1,
    stage: "GROUP",
    kickoff: "2026-06-15T18:00:00Z",
    home_pred: 1,
    away_pred: 0,
    points: 3,
    result_type: "EXACT",
    ...partial,
  }
}

describe("pickLeagueWinners", () => {
  it("returns the single rank-1 player", () => {
    const rows = [
      row({ user_id: "a", total_points: 90 }),
      row({ user_id: "b", total_points: 80 }),
    ]
    expect(pickLeagueWinners(rows).map((r) => r.user_id)).toEqual(["a"])
  })

  it("shares the title on a full tie for rank 1", () => {
    const rows = [
      row({ user_id: "a", total_points: 90, exact_count: 4, outcome_count: 10, scored_count: 40 }),
      row({ user_id: "b", total_points: 90, exact_count: 4, outcome_count: 10, scored_count: 40 }),
      row({ user_id: "c", total_points: 80 }),
    ]
    expect(pickLeagueWinners(rows).map((r) => r.user_id).sort()).toEqual([
      "a",
      "b",
    ])
  })

  it("does not share on a points tie broken by a tiebreaker", () => {
    const rows = [
      row({ user_id: "a", total_points: 90, exact_count: 5 }),
      row({ user_id: "b", total_points: 90, exact_count: 4 }),
    ]
    expect(pickLeagueWinners(rows).map((r) => r.user_id)).toEqual(["a"])
  })

  it("returns empty for an empty leaderboard", () => {
    expect(pickLeagueWinners([])).toEqual([])
  })
})

describe("pickSharpshooters", () => {
  it("returns the single player with the most exact results", () => {
    const rows = [
      row({ user_id: "a", exact_count: 5 }),
      row({ user_id: "b", exact_count: 2 }),
    ]
    expect(pickSharpshooters(rows).map((r) => r.user_id)).toEqual(["a"])
  })

  it("shares the award across a tie", () => {
    const rows = [
      row({ user_id: "a", exact_count: 5 }),
      row({ user_id: "b", exact_count: 5 }),
      row({ user_id: "c", exact_count: 3 }),
    ]
    expect(pickSharpshooters(rows).map((r) => r.user_id).sort()).toEqual([
      "a",
      "b",
    ])
  })

  it("returns empty when nobody has an exact result", () => {
    expect(pickSharpshooters([row({ exact_count: 0 })])).toEqual([])
  })

  it("returns empty for an empty leaderboard", () => {
    expect(pickSharpshooters([])).toEqual([])
  })
})

describe("pickEverPresent", () => {
  it("shares the award across a tie on scored_count", () => {
    const rows = [
      row({ user_id: "a", scored_count: 40 }),
      row({ user_id: "b", scored_count: 40 }),
      row({ user_id: "c", scored_count: 39 }),
    ]
    expect(pickEverPresent(rows).map((r) => r.user_id).sort()).toEqual([
      "a",
      "b",
    ])
  })
})

describe("pickBestSingleCall", () => {
  it("picks the highest-points EXACT row", () => {
    const rows = [
      call({ user_id: "a", points: 3 }),
      call({ user_id: "b", points: 12 }),
    ]
    expect(pickBestSingleCall(rows)?.user_id).toBe("b")
  })

  it("breaks a points tie on the earlier kickoff", () => {
    const rows = [
      call({ user_id: "a", points: 6, kickoff: "2026-07-01T18:00:00Z" }),
      call({ user_id: "b", points: 6, kickoff: "2026-06-15T18:00:00Z" }),
    ]
    expect(pickBestSingleCall(rows)?.user_id).toBe("b")
  })

  it("ignores non-EXACT and null-points rows", () => {
    const rows = [
      call({ user_id: "a", result_type: "OUTCOME", points: 1 }),
      call({ user_id: "b", result_type: "EXACT", points: null }),
      call({ user_id: "c", result_type: "EXACT", points: 9 }),
    ]
    expect(pickBestSingleCall(rows)?.user_id).toBe("c")
  })

  it("returns null when there are no EXACT rows", () => {
    expect(pickBestSingleCall([call({ result_type: "MISS", points: 0 })])).toBeNull()
  })
})
