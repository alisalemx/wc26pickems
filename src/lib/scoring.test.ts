import { describe, it, expect } from "vitest"
import {
  STAGE_MULTIPLIER,
  maxPoints,
  scorePrediction,
  remainingMaxPoints,
} from "./scoring"

// Mirrors supabase/migrations/0001_init.sql stage_multiplier() — if this
// fails, one side drifted and needs manual reconciliation with the SQL.
describe("STAGE_MULTIPLIER", () => {
  it("matches the SQL stage_multiplier() values exactly", () => {
    expect(STAGE_MULTIPLIER).toEqual({
      GROUP: 1,
      R32: 1,
      R16: 2,
      QF: 2,
      SF: 3,
      THIRD: 2,
      FINAL: 4,
    })
  })
})

describe("maxPoints", () => {
  it("returns 12 for FINAL (3 × 4)", () => {
    expect(maxPoints("FINAL")).toBe(12)
  })

  it("returns 3 for GROUP (3 × 1)", () => {
    expect(maxPoints("GROUP")).toBe(3)
  })
})

describe("scorePrediction", () => {
  it("exact score in GROUP → EXACT, 3 points", () => {
    expect(scorePrediction("GROUP", 2, 1, 2, 1)).toEqual({
      points: 3,
      result: "EXACT",
    })
  })

  it("exact score in FINAL → EXACT, 12 points (3 × mult 4)", () => {
    expect(scorePrediction("FINAL", 2, 1, 2, 1)).toEqual({
      points: 12,
      result: "EXACT",
    })
  })

  it("correct outcome (home win), wrong score → OUTCOME, 1 point (GROUP)", () => {
    // predicted 2-1, actual 1-0: both home wins
    expect(scorePrediction("GROUP", 2, 1, 1, 0)).toEqual({
      points: 1,
      result: "OUTCOME",
    })
  })

  it("correct outcome in FINAL → OUTCOME, 4 points", () => {
    // predicted 2-1, actual 3-1: both home wins
    expect(scorePrediction("FINAL", 2, 1, 3, 1)).toEqual({
      points: 4,
      result: "OUTCOME",
    })
  })

  it("correct draw outcome (predicted 1-1, actual 2-2) → OUTCOME", () => {
    expect(scorePrediction("GROUP", 1, 1, 2, 2)).toEqual({
      points: 1,
      result: "OUTCOME",
    })
  })

  it("exact 0-0 → EXACT (not OUTCOME)", () => {
    expect(scorePrediction("GROUP", 0, 0, 0, 0)).toEqual({
      points: 3,
      result: "EXACT",
    })
  })

  it("wrong outcome (predicted 1-0, actual 0-1) → MISS, 0 points", () => {
    expect(scorePrediction("GROUP", 1, 0, 0, 1)).toEqual({
      points: 0,
      result: "MISS",
    })
  })

  it("predicted draw, actual home win → MISS", () => {
    expect(scorePrediction("GROUP", 1, 1, 2, 0)).toEqual({
      points: 0,
      result: "MISS",
    })
  })
})

describe("remainingMaxPoints", () => {
  it("returns 0 for an empty array", () => {
    expect(remainingMaxPoints([])).toBe(0)
  })

  it("returns 0 when all matches are finished with scores", () => {
    expect(
      remainingMaxPoints([
        { stage: "GROUP", status: "FINISHED", home_score: 1, away_score: 0 },
        { stage: "FINAL", status: "FINISHED", home_score: 2, away_score: 1 },
      ])
    ).toBe(0)
  })

  it("sums max points for unfinished matches only (3 + 12 = 15)", () => {
    expect(
      remainingMaxPoints([
        { stage: "GROUP", status: "SCHEDULED", home_score: null, away_score: null },
        { stage: "FINAL", status: "SCHEDULED", home_score: null, away_score: null },
        { stage: "QF", status: "FINISHED", home_score: 1, away_score: 1 },
      ])
    ).toBe(15)
  })

  it("counts a FINISHED match with a null score as unfinished", () => {
    expect(
      remainingMaxPoints([
        { stage: "GROUP", status: "FINISHED", home_score: null, away_score: 0 },
      ])
    ).toBe(3)
  })

  it("counts an IN_PLAY match with scores set as unfinished", () => {
    expect(
      remainingMaxPoints([
        { stage: "SF", status: "IN_PLAY", home_score: 1, away_score: 0 },
      ])
    ).toBe(9)
  })
})
