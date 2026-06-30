import { describe, it, expect } from "vitest"
import { resolveKnockoutTeams, resolveMatch, winnerSide } from "./bracket"
import type { MatchRow } from "./types"

// A match row with sensible defaults; override what each case needs.
function m(partial: Partial<MatchRow>): MatchRow {
  return {
    id: 1,
    fd_id: null,
    stage: "R32",
    group_name: null,
    matchday: null,
    home_team: null,
    away_team: null,
    home_code: null,
    away_code: null,
    kickoff: "2026-07-01T18:00:00Z",
    venue: null,
    status: "TIMED",
    home_score: null,
    away_score: null,
    home_pens: null,
    away_pens: null,
    duration: "REGULAR",
    minute: null,
    result_locked: false,
    updated_at: "2026-07-01T20:00:00Z",
    ...partial,
  }
}

// A finished R32 feeder that BRA won over NOR.
function braWin(over: { team: string; code: string }, id: number): MatchRow {
  return m({
    id,
    status: "FINISHED",
    home_team: "Brazil",
    home_code: "BRA",
    away_team: over.team,
    away_code: over.code,
    home_score: 2,
    away_score: 0,
  })
}

describe("winnerSide", () => {
  it("returns null while unfinished", () => {
    expect(winnerSide(m({ status: "TIMED" }))).toBeNull()
    expect(winnerSide(m({ status: "IN_PLAY", home_score: 1, away_score: 0 }))).toBeNull()
  })

  it("reads the 90'+ET score", () => {
    expect(winnerSide(m({ status: "FINISHED", home_score: 2, away_score: 1 }))).toBe("home")
    expect(winnerSide(m({ status: "FINISHED", home_score: 0, away_score: 1 }))).toBe("away")
  })

  it("breaks a draw on penalties only", () => {
    expect(
      winnerSide(
        m({ status: "FINISHED", home_score: 1, away_score: 1, home_pens: 4, away_pens: 3 })
      )
    ).toBe("home")
    // Level with no shootout recorded: undecided.
    expect(winnerSide(m({ status: "FINISHED", home_score: 1, away_score: 1 }))).toBeNull()
  })
})

describe("resolveMatch", () => {
  it("fills both slots of an R16 from its feeders' winners (74 -> home, 77 -> away)", () => {
    // FEEDERS[89] = [74, 77]. Brazil wins 74, Spain wins 77.
    const byId = new Map<number, MatchRow>([
      [74, braWin({ team: "Norway", code: "NOR" }, 74)],
      [
        77,
        m({
          id: 77,
          status: "FINISHED",
          home_team: "Spain",
          home_code: "ESP",
          away_team: "Italy",
          away_code: "ITA",
          home_score: 1,
          away_score: 0,
        }),
      ],
      [89, m({ id: 89, stage: "R16" })],
    ])
    const r = resolveMatch(byId, 89)!
    expect(r.home_team).toBe("Brazil")
    expect(r.home_code).toBe("BRA")
    expect(r.away_team).toBe("Spain")
    expect(r.away_code).toBe("ESP")
  })

  it("leaves slots null until the feeder is decided", () => {
    const byId = new Map<number, MatchRow>([
      [74, m({ id: 74, status: "IN_PLAY", home_score: 0, away_score: 0 })],
      [89, m({ id: 89, stage: "R16" })],
    ])
    const r = resolveMatch(byId, 89)!
    expect(r.home_team).toBeNull()
    expect(r.away_team).toBeNull()
  })

  it("never overrides a stored assignment", () => {
    const byId = new Map<number, MatchRow>([
      [74, braWin({ team: "Norway", code: "NOR" }, 74)],
      [
        89,
        m({ id: 89, stage: "R16", home_team: "Argentina", home_code: "ARG" }),
      ],
    ])
    const r = resolveMatch(byId, 89)!
    expect(r.home_team).toBe("Argentina")
  })

  it("feeds the third-place play-off from the SF losers", () => {
    // THIRD_FEEDERS = [101, 102]. France lose 101, Portugal lose 102.
    const byId = new Map<number, MatchRow>([
      [
        101,
        m({
          id: 101,
          stage: "SF",
          status: "FINISHED",
          home_team: "France",
          home_code: "FRA",
          away_team: "Brazil",
          away_code: "BRA",
          home_score: 0,
          away_score: 2,
        }),
      ],
      [
        102,
        m({
          id: 102,
          stage: "SF",
          status: "FINISHED",
          home_team: "Spain",
          home_code: "ESP",
          away_team: "Portugal",
          away_code: "POR",
          home_score: 1,
          away_score: 0,
        }),
      ],
      [103, m({ id: 103, stage: "THIRD" })],
    ])
    const r = resolveMatch(byId, 103)!
    expect(r.home_team).toBe("France") // loser of 101
    expect(r.away_team).toBe("Portugal") // loser of 102
  })
})

describe("resolveKnockoutTeams", () => {
  it("fills knockout rows and passes group rows through untouched", () => {
    const group = m({ id: 1, stage: "GROUP", home_team: null, away_team: null })
    const feeder = braWin({ team: "Norway", code: "NOR" }, 74)
    const r16 = m({ id: 89, stage: "R16" })
    const out = resolveKnockoutTeams([group, feeder, r16])
    const outR16 = out.find((x) => x.id === 89)!
    expect(outR16.home_team).toBe("Brazil")
    // Group row is returned as-is (same reference), never resolved.
    expect(out.find((x) => x.id === 1)).toBe(group)
  })

  it("returns the input unchanged when there are no knockout rows", () => {
    const only = [m({ id: 1, stage: "GROUP" })]
    expect(resolveKnockoutTeams(only)).toBe(only)
  })
})
