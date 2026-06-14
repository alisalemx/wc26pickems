import { describe, it, expect } from "vitest"
import { computeTournamentForm, computeTournamentResults } from "./form"
import type { MatchRow } from "./types"

// Build a finished match row with sensible defaults; override what matters.
function m(partial: Partial<MatchRow>): MatchRow {
  return {
    id: 1,
    fd_id: null,
    stage: "GROUP",
    group_name: "A",
    matchday: 1,
    home_team: "Home",
    away_team: "Away",
    home_code: "HOM",
    away_code: "AWY",
    kickoff: "2026-06-12T18:00:00Z",
    venue: null,
    status: "FINISHED",
    home_score: 0,
    away_score: 0,
    home_pens: null,
    away_pens: null,
    duration: "REGULAR",
    result_locked: false,
    updated_at: "2026-06-12T20:00:00Z",
    ...partial,
  }
}

describe("computeTournamentForm", () => {
  it("records W/L for both teams from one decisive match", () => {
    const form = computeTournamentForm([
      m({ home_code: "BRA", away_code: "SRB", home_score: 2, away_score: 0 }),
    ])
    expect(form.BRA).toBe("W")
    expect(form.SRB).toBe("L")
  })

  it("records a draw as D for both teams", () => {
    const form = computeTournamentForm([
      m({ home_code: "ENG", away_code: "USA", home_score: 1, away_score: 1 }),
    ])
    expect(form.ENG).toBe("D")
    expect(form.USA).toBe("D")
  })

  it("orders a team's results oldest -> newest by kickoff", () => {
    const form = computeTournamentForm([
      m({ id: 2, kickoff: "2026-06-22T18:00:00Z", home_code: "FRA", away_code: "X2", home_score: 0, away_score: 1 }), // L (later)
      m({ id: 1, kickoff: "2026-06-13T18:00:00Z", home_code: "FRA", away_code: "X1", home_score: 3, away_score: 0 }), // W (earlier)
    ])
    expect(form.FRA).toBe("WL")
  })

  it("uses the shootout winner when a knockout is level after 90'+ET", () => {
    const form = computeTournamentForm([
      m({
        stage: "R16",
        home_code: "ARG",
        away_code: "NED",
        home_score: 2,
        away_score: 2,
        home_pens: 4,
        away_pens: 3,
        duration: "PENALTY_SHOOTOUT",
      }),
    ])
    expect(form.ARG).toBe("W")
    expect(form.NED).toBe("L")
  })

  it("ignores matches that are not finished or lack scores/teams", () => {
    const form = computeTournamentForm([
      m({ home_code: "ITA", away_code: "ESP", status: "TIMED", home_score: null, away_score: null }),
      m({ home_code: null, away_code: null, home_score: 1, away_score: 0 }),
    ])
    expect(form.ITA).toBeUndefined()
    expect(Object.keys(form)).toHaveLength(0)
  })
})

describe("computeTournamentResults", () => {
  it("returns detailed results from both perspectives, oldest -> newest", () => {
    const results = computeTournamentResults([
      m({ id: 2, kickoff: "2026-06-22T18:00:00Z", stage: "R32", home_code: "BRA", home_team: "Brazil", away_code: "SRB", away_team: "Serbia", home_score: 0, away_score: 1 }),
      m({ id: 1, kickoff: "2026-06-13T18:00:00Z", home_code: "BRA", home_team: "Brazil", away_code: "MAR", away_team: "Morocco", home_score: 2, away_score: 0 }),
    ])
    expect(results.BRA).toEqual([
      { matchId: 1, date: "2026-06-13T18:00:00Z", stage: "GROUP", opponent: "Morocco", opponentCode: "MAR", gf: 2, ga: 0, outcome: "W" },
      { matchId: 2, date: "2026-06-22T18:00:00Z", stage: "R32", opponent: "Serbia", opponentCode: "SRB", gf: 0, ga: 1, outcome: "L" },
    ])
    expect(results.SRB[0]).toMatchObject({ opponent: "Brazil", gf: 1, ga: 0, outcome: "W" })
  })

  it("uses the shootout winner for a level knockout", () => {
    const results = computeTournamentResults([
      m({ stage: "R16", home_code: "ARG", away_code: "NED", home_score: 2, away_score: 2, home_pens: 4, away_pens: 3, duration: "PENALTY_SHOOTOUT" }),
    ])
    expect(results.ARG[0].outcome).toBe("W")
    expect(results.NED[0].outcome).toBe("L")
  })
})
