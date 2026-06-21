import { describe, it, expect } from "vitest"
import { linkMatches } from "./link-matches.mts"
import type { SeedRow, ApiMatchLite } from "./link-matches.mts"

// Helper: assert the no-double-claim invariant — each row id appears at most once
function assertNoClaim(map: Map<number, number>) {
  expect(new Set(map.values()).size).toBe(map.size)
}

describe("linkMatches", () => {
  it("case 1: 4 group matches on one day, no fd_ids, distinct kickoff times", () => {
    // 4 rows on the same UTC day but different kickoff instants — resolved by pass 1
    const rows: SeedRow[] = [
      { id: 1, fd_id: null, stage: "GROUP", kickoff: "2026-06-13T12:00:00Z", home_code: "AAA", away_code: "BBB" },
      { id: 2, fd_id: null, stage: "GROUP", kickoff: "2026-06-13T15:00:00Z", home_code: "CCC", away_code: "DDD" },
      { id: 3, fd_id: null, stage: "GROUP", kickoff: "2026-06-13T18:00:00Z", home_code: "EEE", away_code: "FFF" },
      { id: 4, fd_id: null, stage: "GROUP", kickoff: "2026-06-13T21:00:00Z", home_code: "GGG", away_code: "HHH" },
    ]
    const api: ApiMatchLite[] = [
      { fdId: 1001, stage: "GROUP", utcDate: "2026-06-13T12:00:00Z", homeTla: "AAA", awayTla: "BBB" },
      { fdId: 1002, stage: "GROUP", utcDate: "2026-06-13T15:00:00Z", homeTla: "CCC", awayTla: "DDD" },
      { fdId: 1003, stage: "GROUP", utcDate: "2026-06-13T18:00:00Z", homeTla: "EEE", awayTla: "FFF" },
      { fdId: 1004, stage: "GROUP", utcDate: "2026-06-13T21:00:00Z", homeTla: "GGG", awayTla: "HHH" },
    ]
    const map = linkMatches(rows, api)
    expect(map.size).toBe(4)
    expect(map.get(1001)).toBe(1)
    expect(map.get(1002)).toBe(2)
    expect(map.get(1003)).toBe(3)
    expect(map.get(1004)).toBe(4)
    assertNoClaim(map)
  })

  it("case 2: simultaneous kickoffs, codes disambiguate via pass 2", () => {
    // Two GROUP rows with identical kickoff instants but different code pairs
    const rows: SeedRow[] = [
      { id: 1, fd_id: null, stage: "GROUP", kickoff: "2026-06-25T18:00:00Z", home_code: "MEX", away_code: "KOR" },
      { id: 2, fd_id: null, stage: "GROUP", kickoff: "2026-06-25T18:00:00Z", home_code: "BRA", away_code: "ARG" },
    ]
    const api: ApiMatchLite[] = [
      { fdId: 2001, stage: "GROUP", utcDate: "2026-06-25T18:00:00Z", homeTla: "MEX", awayTla: "KOR" },
      { fdId: 2002, stage: "GROUP", utcDate: "2026-06-25T18:00:00Z", homeTla: "BRA", awayTla: "ARG" },
    ]
    const map = linkMatches(rows, api)
    expect(map.size).toBe(2)
    expect(map.get(2001)).toBe(1)
    expect(map.get(2002)).toBe(2)
    assertNoClaim(map)
  })

  it("case 3: simultaneous kickoffs, codes missing on both rows — neither links", () => {
    // Both rows have null codes; cannot disambiguate via pass 2; >1 per day key in pass 3
    const rows: SeedRow[] = [
      { id: 1, fd_id: null, stage: "GROUP", kickoff: "2026-06-25T18:00:00Z", home_code: null, away_code: null },
      { id: 2, fd_id: null, stage: "GROUP", kickoff: "2026-06-25T18:00:00Z", home_code: null, away_code: null },
    ]
    const api: ApiMatchLite[] = [
      { fdId: 3001, stage: "GROUP", utcDate: "2026-06-25T18:00:00Z", homeTla: "MEX", awayTla: "KOR" },
      { fdId: 3002, stage: "GROUP", utcDate: "2026-06-25T18:00:00Z", homeTla: "BRA", awayTla: "ARG" },
    ]
    const map = linkMatches(rows, api)
    expect(map.size).toBe(0)
    assertNoClaim(map)
  })

  it("case 4: fd_id already set wins even if kickoff drifted to another day", () => {
    // Row has fd_id 4001; API match also has id 4001 but a different day
    const rows: SeedRow[] = [
      { id: 1, fd_id: 4001, stage: "QF", kickoff: "2026-07-03T18:00:00Z", home_code: "FRA", away_code: "ENG" },
    ]
    const api: ApiMatchLite[] = [
      // Same fd_id but utcDate shifted to a different day
      { fdId: 4001, stage: "QF", utcDate: "2026-07-04T18:00:00Z", homeTla: "FRA", awayTla: "ENG" },
    ]
    const map = linkMatches(rows, api)
    expect(map.size).toBe(1)
    expect(map.get(4001)).toBe(1)
    assertNoClaim(map)
  })

  it("case 5: knockout single match per day, kickoff time differs between seed and API (pass 3)", () => {
    // Seed says 18:00Z, API says 20:00Z — different instant but same UTC day
    const rows: SeedRow[] = [
      { id: 1, fd_id: null, stage: "R16", kickoff: "2026-06-28T18:00:00Z", home_code: "GER", away_code: "ESP" },
    ]
    const api: ApiMatchLite[] = [
      { fdId: 5001, stage: "R16", utcDate: "2026-06-28T20:00:00Z", homeTla: "GER", awayTla: "ESP" },
    ]
    const map = linkMatches(rows, api)
    expect(map.size).toBe(1)
    expect(map.get(5001)).toBe(1)
    assertNoClaim(map)
  })

  it("case 6: two API matches share same instant, one seed row — neither links", () => {
    // Only one row but two API matches at the same instant/day/stage; all passes produce >1 api, so 0 links
    const rows: SeedRow[] = [
      { id: 1, fd_id: null, stage: "GROUP", kickoff: "2026-06-15T15:00:00Z", home_code: null, away_code: null },
    ]
    const api: ApiMatchLite[] = [
      { fdId: 6001, stage: "GROUP", utcDate: "2026-06-15T15:00:00Z", homeTla: "USA", awayTla: "CAN" },
      { fdId: 6002, stage: "GROUP", utcDate: "2026-06-15T15:00:00Z", homeTla: "MEX", awayTla: "BOL" },
    ]
    // Pass 1: 1 row, 2 api at same instant → skip
    // Pass 2: row codes null → skip
    // Pass 3: 1 row, 2 api for the day → skip
    const map = linkMatches(rows, api)
    expect(map.size).toBe(0)
    assertNoClaim(map)
  })

  it("case 7: no double-claim invariant across a mixed scenario", () => {
    // Mix of fd_id, distinct instant, and different-time-same-day
    const rows: SeedRow[] = [
      { id: 1, fd_id: 7001, stage: "GROUP", kickoff: "2026-06-14T12:00:00Z", home_code: "AAA", away_code: "BBB" },
      { id: 2, fd_id: null,  stage: "GROUP", kickoff: "2026-06-14T15:00:00Z", home_code: "CCC", away_code: "DDD" },
      { id: 3, fd_id: null,  stage: "GROUP", kickoff: "2026-06-14T18:00:00Z", home_code: "EEE", away_code: "FFF" },
      { id: 4, fd_id: null,  stage: "QF",    kickoff: "2026-07-03T18:00:00Z", home_code: "GGG", away_code: "HHH" },
    ]
    const api: ApiMatchLite[] = [
      { fdId: 7001, stage: "GROUP", utcDate: "2026-06-14T12:00:00Z", homeTla: "AAA", awayTla: "BBB" },
      { fdId: 7002, stage: "GROUP", utcDate: "2026-06-14T15:00:00Z", homeTla: "CCC", awayTla: "DDD" },
      { fdId: 7003, stage: "GROUP", utcDate: "2026-06-14T18:00:00Z", homeTla: "EEE", awayTla: "FFF" },
      { fdId: 7004, stage: "QF",    utcDate: "2026-07-03T20:00:00Z", homeTla: "GGG", awayTla: "HHH" },
    ]
    const map = linkMatches(rows, api)
    expect(map.size).toBe(4)
    expect(map.get(7001)).toBe(1) // pass 0 — explicit fd_id
    expect(map.get(7002)).toBe(2) // pass 1 — exact instant
    expect(map.get(7003)).toBe(3) // pass 1 — exact instant
    expect(map.get(7004)).toBe(4) // pass 3 — unique day
    assertNoClaim(map)
  })

  it("case 8: URU/URY alias lets pass 2 link Uruguay when pass 3 can't recover", () => {
    // Three simultaneous GROUP matches, so pass 1 (exact instant) can't split
    // them. Uruguay is seeded URU but the feed reports URY, and a second match
    // has unknowable (null) codes. Without the alias, Uruguay fails pass 2 and
    // falls to pass 3 alongside that null-code match (2 rows + 2 api for the
    // day) — which links neither. The URY→URU alias resolves Uruguay in pass 2.
    const rows: SeedRow[] = [
      { id: 1, fd_id: null, stage: "GROUP", kickoff: "2026-06-26T18:00:00Z", home_code: "URU", away_code: "ESP" },
      { id: 2, fd_id: null, stage: "GROUP", kickoff: "2026-06-26T18:00:00Z", home_code: null, away_code: null },
      { id: 3, fd_id: null, stage: "GROUP", kickoff: "2026-06-26T18:00:00Z", home_code: "BRA", away_code: "ARG" },
    ]
    const api: ApiMatchLite[] = [
      { fdId: 8001, stage: "GROUP", utcDate: "2026-06-26T18:00:00Z", homeTla: "URY", awayTla: "ESP" },
      { fdId: 8002, stage: "GROUP", utcDate: "2026-06-26T18:00:00Z", homeTla: "GER", awayTla: "FRA" },
      { fdId: 8003, stage: "GROUP", utcDate: "2026-06-26T18:00:00Z", homeTla: "BRA", awayTla: "ARG" },
    ]
    const map = linkMatches(rows, api)
    expect(map.get(8001)).toBe(1) // Uruguay linked via the URY→URU alias (pass 2)
    expect(map.get(8003)).toBe(3) // exact-code match (pass 2)
    assertNoClaim(map)
  })
})
