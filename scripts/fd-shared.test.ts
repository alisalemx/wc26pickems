import { describe, it, expect } from "vitest"
import { KNOCKOUT_FD_ID_TO_NUMBER, mapApiStage } from "./fd-shared"

describe("KNOCKOUT_FD_ID_TO_NUMBER", () => {
  const numbers = Object.values(KNOCKOUT_FD_ID_TO_NUMBER)

  it("maps exactly the 32 knockout matches", () => {
    expect(numbers).toHaveLength(32)
    expect(Object.keys(KNOCKOUT_FD_ID_TO_NUMBER)).toHaveLength(32)
  })

  it("is a bijection onto the official numbers 73..104", () => {
    const sorted = [...numbers].sort((a, b) => a - b)
    const expected = Array.from({ length: 32 }, (_, i) => 73 + i)
    expect(sorted).toEqual(expected)
  })

  it("has no duplicate fd ids", () => {
    const fdIds = Object.keys(KNOCKOUT_FD_ID_TO_NUMBER)
    expect(new Set(fdIds).size).toBe(fdIds.length)
  })
})

describe("mapApiStage", () => {
  it("maps the knockout stages we pin to numbers", () => {
    expect(mapApiStage("LAST_16")).toBe("R16")
    expect(mapApiStage("ROUND_OF_32")).toBe("R32")
    expect(mapApiStage("FINAL")).toBe("FINAL")
  })

  it("throws on an unknown stage rather than defaulting", () => {
    expect(() => mapApiStage("BOGUS")).toThrow()
  })
})
