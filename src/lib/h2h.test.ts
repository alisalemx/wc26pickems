import { describe, expect, it } from "vitest"
import { pairKey, summarizeMeetings, type H2hMeeting } from "./h2h"

describe("pairKey", () => {
  it("sorts codes alphabetically regardless of input order", () => {
    expect(pairKey("SUI", "ARG")).toBe("ARG-SUI")
    expect(pairKey("ARG", "SUI")).toBe("ARG-SUI")
  })
})

describe("summarizeMeetings", () => {
  it("tallies wins/draws relative to codeA", () => {
    const meetings: H2hMeeting[] = [
      {
        date: "2022-11-16",
        competition: "Friendly",
        home: "ARG",
        away: "SUI",
        home_score: 2,
        away_score: 0,
      },
      {
        date: "2014-07-01",
        competition: "World Cup R16",
        home: "SUI",
        away: "ARG",
        home_score: 0,
        away_score: 1,
      },
      {
        date: "2010-06-16",
        competition: "World Cup",
        home: "SUI",
        away: "ARG",
        home_score: 1,
        away_score: 1,
      },
    ]
    expect(summarizeMeetings(meetings, "ARG")).toEqual({
      winsA: 2,
      draws: 1,
      winsB: 0,
    })
    expect(summarizeMeetings(meetings, "SUI")).toEqual({
      winsA: 0,
      draws: 1,
      winsB: 2,
    })
  })

  it("counts a shootout meeting as a draw, ignoring pens", () => {
    const meetings: H2hMeeting[] = [
      {
        date: "2018-07-01",
        competition: "World Cup QF",
        home: "FRA",
        away: "ESP",
        home_score: 1,
        away_score: 1,
        home_pens: 4,
        away_pens: 3,
      },
    ]
    expect(summarizeMeetings(meetings, "FRA")).toEqual({
      winsA: 0,
      draws: 1,
      winsB: 0,
    })
  })
})
