import { describe, it, expect } from "vitest"
import { liveScoreUrl } from "./links"

describe("liveScoreUrl", () => {
  it("builds a google search for the fixture, pinned to the world cup", () => {
    expect(liveScoreUrl("Brazil", "Argentina")).toBe(
      "https://www.google.com/search?q=Brazil%20vs%20Argentina%20world%20cup"
    )
  })

  it("encodes accents and spaces in team names", () => {
    expect(liveScoreUrl("Côte d'Ivoire", "Korea Republic")).toBe(
      "https://www.google.com/search?q=C%C3%B4te%20d'Ivoire%20vs%20Korea%20Republic%20world%20cup"
    )
  })
})
