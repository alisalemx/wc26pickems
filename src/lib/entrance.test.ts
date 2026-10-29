import { describe, it, expect } from "vitest"
import { entranceClasses, switchEntrance } from "./entrance"

const CASCADE = "animate-in slide-in-from-bottom-2 stagger-in"

describe("switchEntrance", () => {
  it("fades after a pointer switch", () => {
    expect(switchEntrance(false)).toBe("fade")
  })

  it("doesn't animate after an arrow-key switch", () => {
    expect(switchEntrance(true)).toBe("none")
  })
})

describe("entranceClasses", () => {
  it("uses the caller's own entrance for a first load", () => {
    expect(entranceClasses("cascade", CASCADE)).toBe(CASCADE)
  })

  it("swaps in a quick fade with no movement or stagger", () => {
    const fade = entranceClasses("fade", CASCADE)
    expect(fade).toContain("fade-in-0")
    expect(fade).toContain("var(--duration-fast)")
    expect(fade).not.toMatch(/slide-in|stagger-in/)
  })

  it("adds no animation at all for a keyboard switch", () => {
    expect(entranceClasses("none", CASCADE)).toBe("")
  })
})
