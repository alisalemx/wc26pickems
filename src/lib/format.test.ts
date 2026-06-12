import { describe, it, expect } from "vitest"
import { isLocked, initials } from "./format"

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

describe("initials", () => {
  it("single handle with no separators → first two chars uppercased", () => {
    expect(initials("alisalem")).toBe("AL")
  })

  it("underscore-separated parts → first char of each part uppercased", () => {
    expect(initials("foo_bar")).toBe("FB")
  })
})
