import { describe, it, expect } from "vitest"
import { isLocked, initials, formatCountdown, shortDate, ordinal } from "./format"

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

describe("initials", () => {
  it("single handle with no separators → first two chars uppercased", () => {
    expect(initials("alisalem")).toBe("AL")
  })

  it("underscore-separated parts → first char of each part uppercased", () => {
    expect(initials("foo_bar")).toBe("FB")
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
