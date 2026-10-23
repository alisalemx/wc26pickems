import { describe, expect, it } from "vitest"
import { flagUrl, KNOWN_TEAM_CODES } from "./flags"

describe("flagUrl", () => {
  it("bundles a flag for every known team code", () => {
    const missing = KNOWN_TEAM_CODES.filter((code) => flagUrl(code) == null)
    expect(missing).toEqual([])
  })

  it("resolves the GB subdivisions", () => {
    expect(flagUrl("ENG")).toMatch(/gb-eng/)
    expect(flagUrl("SCO")).toMatch(/gb-sct/)
  })

  it("returns null for an undecided or unknown team", () => {
    expect(flagUrl(null)).toBeNull()
    expect(flagUrl("XYZ")).toBeNull()
  })
})
