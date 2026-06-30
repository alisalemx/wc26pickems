import { describe, it, expect } from "vitest"
import {
  parseEspnScoreboard,
  indexEspnByInstant,
  mapEspnStatus,
  espnDuration,
  espnMinute,
} from "./espn.mts"
import type { EspnScoreboard } from "./espn.mts"

// Fixtures mirror the real shapes captured from ESPN's WC scoreboard feed.
function event(
  date: string,
  state: string,
  name: string,
  completed: boolean,
  home: { score?: string | number; shootoutScore?: number },
  away: { score?: string | number; shootoutScore?: number },
  displayClock?: string
): EspnScoreboard["events"] extends (infer E)[] ? E : never {
  return {
    competitions: [
      {
        date,
        status: { type: { state, name, completed }, displayClock },
        competitors: [
          { homeAway: "home", ...home },
          { homeAway: "away", ...away },
        ],
      },
    ],
  }
}

describe("mapEspnStatus", () => {
  it("maps completed post matches to FINISHED", () => {
    expect(mapEspnStatus("post", "STATUS_FULL_TIME", true)).toBe("FINISHED")
    expect(mapEspnStatus("post", "STATUS_FINAL_PEN", true)).toBe("FINISHED")
  })
  it("maps an uncompleted post match (suspended) to a non-final status", () => {
    expect(mapEspnStatus("post", "STATUS_ABANDONED", false)).not.toBe("FINISHED")
  })
  it("maps halftime to PAUSED and other in-progress to IN_PLAY", () => {
    expect(mapEspnStatus("in", "STATUS_HALFTIME", false)).toBe("PAUSED")
    expect(mapEspnStatus("in", "STATUS_SECOND_HALF", false)).toBe("IN_PLAY")
  })
  it("maps pre / unknown to TIMED", () => {
    expect(mapEspnStatus("pre", "STATUS_SCHEDULED", false)).toBe("TIMED")
    expect(mapEspnStatus(undefined, undefined, undefined)).toBe("TIMED")
  })
})

describe("espnMinute", () => {
  it("passes ESPN's formatted clock through while in-play", () => {
    expect(espnMinute({ type: { state: "in" }, displayClock: "67'" }, "in")).toBe(
      "67'"
    )
    expect(
      espnMinute({ type: { state: "in" }, displayClock: "45'+2'" }, "in")
    ).toBe("45'+2'")
  })
  it("collapses halftime to HT regardless of the frozen clock", () => {
    expect(
      espnMinute(
        { type: { state: "in", name: "STATUS_HALFTIME" }, displayClock: "45'" },
        "in"
      )
    ).toBe("HT")
  })
  it("is null pre-match and at full time (not being clocked)", () => {
    expect(espnMinute({ displayClock: "0'" }, "pre")).toBeNull()
    expect(espnMinute({ displayClock: "90'" }, "post")).toBeNull()
  })
  it("is null when the clock is blank or non-numeric", () => {
    expect(espnMinute({ type: { state: "in" }, displayClock: "-" }, "in")).toBeNull()
    expect(espnMinute({ type: { state: "in" } }, "in")).toBeNull()
  })
})

describe("espnDuration", () => {
  it("is PENALTY_SHOOTOUT when pens present or status says so", () => {
    expect(espnDuration("STATUS_FULL_TIME", true)).toBe("PENALTY_SHOOTOUT")
    expect(espnDuration("STATUS_FINAL_PEN", false)).toBe("PENALTY_SHOOTOUT")
  })
  it("is EXTRA_TIME for AET/overtime without pens", () => {
    expect(espnDuration("STATUS_FINAL_AET", false)).toBe("EXTRA_TIME")
  })
  it("is REGULAR otherwise", () => {
    expect(espnDuration("STATUS_FULL_TIME", false)).toBe("REGULAR")
  })
})

describe("parseEspnScoreboard", () => {
  it("parses a penalty-shootout final (the Germany–Paraguay case)", () => {
    const body: EspnScoreboard = {
      events: [
        event(
          "2026-06-29T20:30Z",
          "post",
          "STATUS_FINAL_PEN",
          true,
          { score: "1", shootoutScore: 3 },
          { score: "1", shootoutScore: 4 }
        ),
      ],
    }
    const [r] = parseEspnScoreboard(body)
    expect(r.kickoffMs).toBe(new Date("2026-06-29T20:30Z").getTime())
    expect(r.status).toBe("FINISHED")
    expect(r.duration).toBe("PENALTY_SHOOTOUT")
    // The 90'+ET score predictions are judged on — NOT the shootout.
    expect([r.homeScore, r.awayScore]).toEqual([1, 1])
    expect([r.homePens, r.awayPens]).toEqual([3, 4])
  })

  it("parses a regulation full-time win", () => {
    const body: EspnScoreboard = {
      events: [
        event("2026-06-29T17:00Z", "post", "STATUS_FULL_TIME", true, { score: "2" }, { score: "1" }),
      ],
    }
    const [r] = parseEspnScoreboard(body)
    expect(r.status).toBe("FINISHED")
    expect(r.duration).toBe("REGULAR")
    expect([r.homeScore, r.awayScore]).toEqual([2, 1])
    expect([r.homePens, r.awayPens]).toEqual([null, null])
  })

  it("treats a scheduled fixture's 0-0 as null scores (not a real draw)", () => {
    const body: EspnScoreboard = {
      events: [
        event("2026-06-30T01:00Z", "pre", "STATUS_SCHEDULED", false, { score: "0" }, { score: "0" }),
      ],
    }
    const [r] = parseEspnScoreboard(body)
    expect(r.status).toBe("TIMED")
    expect([r.homeScore, r.awayScore]).toEqual([null, null])
  })

  it("keeps live in-progress scores and the match clock", () => {
    const body: EspnScoreboard = {
      events: [
        event("2026-07-01T16:00Z", "in", "STATUS_SECOND_HALF", false, { score: "1" }, { score: "0" }, "67'"),
      ],
    }
    const [r] = parseEspnScoreboard(body)
    expect(r.status).toBe("IN_PLAY")
    expect([r.homeScore, r.awayScore]).toEqual([1, 0])
    expect(r.minute).toBe("67'")
  })

  it("reports no minute for a finished match (clock cleared)", () => {
    const body: EspnScoreboard = {
      events: [
        event("2026-06-29T17:00Z", "post", "STATUS_FULL_TIME", true, { score: "2" }, { score: "1" }, "90'"),
      ],
    }
    const [r] = parseEspnScoreboard(body)
    expect(r.minute).toBeNull()
  })

  it("skips malformed events (no competitors / no date)", () => {
    const body = {
      events: [
        { competitions: [{ date: "2026-07-01T16:00Z", competitors: [] }] },
        { competitions: [{ competitors: [{ homeAway: "home" }, { homeAway: "away" }] }] },
      ],
    } as unknown as EspnScoreboard
    expect(parseEspnScoreboard(body)).toEqual([])
  })

  it("indexes by kickoff instant", () => {
    const results = parseEspnScoreboard({
      events: [
        event("2026-06-29T20:30Z", "post", "STATUS_FINAL_PEN", true, { score: "1", shootoutScore: 3 }, { score: "1", shootoutScore: 4 }),
      ],
    })
    const idx = indexEspnByInstant(results)
    expect(idx.get(new Date("2026-06-29T20:30Z").getTime())?.awayPens).toBe(4)
  })
})
