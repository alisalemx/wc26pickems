import { describe, it, expect } from "vitest"
import {
  isLocked,
  isLive,
  MAX_LIVE_MS_GROUP,
  MAX_LIVE_MS_BRACKET,
  formatCountdown,
  shortDate,
  ordinal,
  parseClockMinute,
  formatClock,
} from "./format"

describe("isLocked", () => {
  const kickoff = "2026-07-01T18:00:00Z"
  const kickoffMs = new Date(kickoff).getTime()

  it("returns false one millisecond before kickoff", () => {
    expect(isLocked(kickoff, kickoffMs - 1)).toBe(false)
  })

  it("returns true at exactly kickoff", () => {
    expect(isLocked(kickoff, kickoffMs)).toBe(true)
  })

  it("returns true after kickoff", () => {
    expect(isLocked(kickoff, kickoffMs + 60_000)).toBe(true)
  })
})

describe("isLive", () => {
  const kickoff = "2026-07-01T18:00:00Z"
  const kickoffMs = new Date(kickoff).getTime()

  it("is not live before kickoff", () => {
    expect(isLive(kickoff, "TIMED", "GROUP", kickoffMs - 1)).toBe(false)
  })

  it("is live once kickoff passes and no final result is in", () => {
    expect(isLive(kickoff, "IN_PLAY", "GROUP", kickoffMs + 60_000)).toBe(true)
  })

  it("is live right at kickoff even before the feed flips to IN_PLAY", () => {
    expect(isLive(kickoff, "TIMED", "GROUP", kickoffMs)).toBe(true)
  })

  it("is never live once FINISHED, even within the window", () => {
    expect(isLive(kickoff, "FINISHED", "GROUP", kickoffMs + 60_000)).toBe(false)
  })

  it("stops being live past the group window when stuck unfinished (the bug)", () => {
    // A feed left stuck at IN_PLAY hours after full time must not pulse forever.
    expect(isLive(kickoff, "IN_PLAY", "GROUP", kickoffMs + MAX_LIVE_MS_GROUP + 1)).toBe(
      false
    )
  })

  it("is live at exactly the group window edge", () => {
    expect(isLive(kickoff, "IN_PLAY", "GROUP", kickoffMs + MAX_LIVE_MS_GROUP)).toBe(true)
  })

  it("gives knockout games a longer window for extra time and penalties", () => {
    // Past the group window but within the bracket window: a group game is no
    // longer live, but a knockout game still is.
    const t = kickoffMs + MAX_LIVE_MS_GROUP + 60_000
    expect(isLive(kickoff, "IN_PLAY", "GROUP", t)).toBe(false)
    expect(isLive(kickoff, "IN_PLAY", "FINAL", t)).toBe(true)
  })

  it("stops being live past the bracket window", () => {
    expect(isLive(kickoff, "IN_PLAY", "R32", kickoffMs + MAX_LIVE_MS_BRACKET + 1)).toBe(
      false
    )
  })
})

describe("formatCountdown", () => {
  const kickoff = "2026-07-01T18:00:00Z"
  const at = (ms: number) => new Date(kickoff).getTime() - ms

  it("returns null at exactly kickoff", () => {
    expect(formatCountdown(kickoff, at(0))).toBeNull()
  })

  it("returns null once kickoff has passed", () => {
    expect(formatCountdown(kickoff, at(-60_000))).toBeNull()
  })

  it("shows days plus a padded clock when more than a day away", () => {
    const ms = 3 * 86_400_000 + 4 * 3_600_000 + 12 * 60_000 + 30_000
    expect(formatCountdown(kickoff, at(ms))).toBe("3D 04:12:30")
  })

  it("drops the days unit under a day", () => {
    const ms = 5 * 3_600_000 + 12 * 60_000 + 30_000
    expect(formatCountdown(kickoff, at(ms))).toBe("5:12:30")
  })

  it("drops hours under an hour", () => {
    expect(formatCountdown(kickoff, at(8 * 60_000 + 30_000))).toBe("8:30")
  })

  it("shows zero minutes in the final minute", () => {
    expect(formatCountdown(kickoff, at(42_000))).toBe("0:42")
  })

  it("truncates sub-second remainders toward the lower unit", () => {
    expect(formatCountdown(kickoff, at(1_999))).toBe("0:01")
  })
})

describe("parseClockMinute", () => {
  it("parses a clean minute, with or without the apostrophe", () => {
    expect(parseClockMinute("67'")).toBe(67)
    expect(parseClockMinute("67")).toBe(67)
    expect(parseClockMinute("3'")).toBe(3)
  })
  it("is null for stoppage, halftime, and empty/garbage", () => {
    expect(parseClockMinute("45'+2'")).toBeNull()
    expect(parseClockMinute("HT")).toBeNull()
    expect(parseClockMinute("")).toBeNull()
    expect(parseClockMinute(null)).toBeNull()
  })
})

describe("formatClock", () => {
  it("renders M:SS with unpadded minutes and padded seconds", () => {
    expect(formatClock(7)).toBe("0:07")
    expect(formatClock(67)).toBe("1:07")
    expect(formatClock(4023)).toBe("67:03")
    expect(formatClock(4020)).toBe("67:00")
  })
})

describe("shortDate", () => {
  it("renders abbreviated month and numeric day", () => {
    expect(shortDate("2026-07-01T18:00:00Z")).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/)
  })
})

describe("ordinal", () => {
  it("uses st/nd/rd for 1/2/3", () => {
    expect(ordinal(1)).toBe("1st")
    expect(ordinal(2)).toBe("2nd")
    expect(ordinal(3)).toBe("3rd")
    expect(ordinal(4)).toBe("4th")
  })

  it("uses th for the 11/12/13 exception", () => {
    expect(ordinal(11)).toBe("11th")
    expect(ordinal(12)).toBe("12th")
    expect(ordinal(13)).toBe("13th")
  })

  it("uses st/nd/rd again past the teens", () => {
    expect(ordinal(21)).toBe("21st")
    expect(ordinal(22)).toBe("22nd")
    expect(ordinal(23)).toBe("23rd")
    expect(ordinal(111)).toBe("111th")
  })
})
