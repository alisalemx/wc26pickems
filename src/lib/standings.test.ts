import { describe, it, expect } from "vitest"
import { computeGroup, rankThirds, type Standing } from "./standings"
import type { MatchRow } from "./types"

/** Build a group match. Pass scores to mark it FINISHED; omit for a fixture that
 *  hasn't kicked off yet. */
function mk(
  home: string,
  away: string,
  hs?: number,
  as?: number
): MatchRow {
  const finished = hs != null && as != null
  return {
    id: 0,
    fd_id: null,
    stage: "GROUP",
    group_name: "A",
    matchday: 1,
    home_team: home,
    away_team: away,
    home_code: home.slice(0, 3).toUpperCase(),
    away_code: away.slice(0, 3).toUpperCase(),
    kickoff: "2026-06-12T18:00:00Z",
    venue: null,
    status: finished ? "FINISHED" : "TIMED",
    home_score: finished ? hs : null,
    away_score: finished ? as : null,
    home_pens: null,
    away_pens: null,
    duration: "REGULAR",
    result_locked: false,
    updated_at: "2026-06-12T20:00:00Z",
  }
}

const order = (rows: Standing[]) => rows.map((r) => r.team)
const st = (p: Partial<Standing>): Standing => ({
  team: "X",
  code: null,
  p: 0,
  w: 0,
  d: 0,
  l: 0,
  gf: 0,
  ga: 0,
  pts: 0,
  ...p,
})

describe("computeGroup", () => {
  it("lists every team even before any match is played", () => {
    const rows = computeGroup([mk("Brazil", "Serbia"), mk("Ghana", "Spain")])
    expect(rows).toHaveLength(4)
    expect(rows.every((r) => r.p === 0)).toBe(true)
    // All level → alphabetical fallback.
    expect(order(rows)).toEqual(["Brazil", "Ghana", "Serbia", "Spain"])
  })

  it("orders by points, then goal difference", () => {
    // A wins everything (9 pts), D loses everything. B and C both finish on 4
    // pts and drew head-to-head (so h2h can't separate them) — B's better goal
    // difference (+2 vs 0) puts it above C.
    const rows = computeGroup([
      mk("A", "B", 1, 0),
      mk("A", "C", 1, 0),
      mk("A", "D", 1, 0),
      mk("B", "C", 0, 0),
      mk("B", "D", 3, 0),
      mk("C", "D", 1, 0),
    ])
    expect(order(rows)).toEqual(["A", "B", "C", "D"])
    const [, b, c] = rows
    expect(b.pts).toBe(c.pts) // B and C level on points
    expect(b.gf - b.ga).toBeGreaterThan(c.gf - c.ga)
  })

  it("breaks a two-way tie by head-to-head result", () => {
    // A and B finish identical on points/GD/GF (4, 0, 2); A beat B 1-0.
    // D also ends on 4 pts but with fewer goals scored, so it sits below them.
    const rows = computeGroup([
      mk("A", "B", 1, 0),
      mk("A", "C", 1, 1),
      mk("A", "D", 0, 1),
      mk("B", "C", 1, 1),
      mk("B", "D", 1, 0),
      mk("C", "D", 0, 0),
    ])
    expect(order(rows)).toEqual(["A", "B", "D", "C"])
    // Confirm A and B really were level on the overall three criteria.
    const a = rows.find((r) => r.team === "A")!
    const b = rows.find((r) => r.team === "B")!
    expect([a.pts, a.gf - a.ga, a.gf]).toEqual([b.pts, b.gf - b.ga, b.gf])
  })

  it("falls back to name order when head-to-head is a perfect cycle", () => {
    // A>B>C>A, all 1W/1L, identical overall and identical mini-table → unbreakable.
    const rows = computeGroup([
      mk("A", "B", 1, 0),
      mk("B", "C", 1, 0),
      mk("C", "A", 1, 0),
    ])
    expect(order(rows)).toEqual(["A", "B", "C"])
  })

  it("uses head-to-head only among the tied teams, not the whole group", () => {
    // X and Y both finish on 6 pts, +2 GD, 3 GF. Y beat X in the decider, so Y
    // ranks above X despite X's name sorting earlier — proving h2h, not name, won.
    const rows = computeGroup([
      mk("X", "Y", 0, 1), // Y wins the decider
      mk("X", "P", 2, 0),
      mk("X", "Q", 1, 0),
      mk("Y", "P", 2, 0),
      mk("Y", "Q", 0, 1),
      mk("P", "Q", 0, 1),
    ])
    const x = rows.find((r) => r.team === "X")!
    const y = rows.find((r) => r.team === "Y")!
    expect([x.pts, x.gf - x.ga, x.gf]).toEqual([y.pts, y.gf - y.ga, y.gf])
    expect(order(rows).indexOf("Y")).toBeLessThan(order(rows).indexOf("X"))
  })
})

describe("rankThirds", () => {
  it("orders by points, then goal difference, then goals, then name", () => {
    const thirds = [
      st({ team: "BigGD", pts: 3, gf: 9, ga: 0 }), // 3 pts, +9
      st({ team: "TopPts", pts: 4, gf: 1, ga: 1 }), // 4 pts
      st({ team: "MidGD", pts: 3, gf: 5, ga: 1 }), // 3 pts, +4
      st({ team: "MoreGoals", pts: 3, gf: 4, ga: 3 }), // 3 pts, +1, 4 GF
      st({ team: "Bravo", pts: 3, gf: 2, ga: 1 }), // 3 pts, +1, 2 GF
      st({ team: "Alpha", pts: 3, gf: 2, ga: 1 }), // 3 pts, +1, 2 GF, name wins
    ]
    expect([...thirds].sort(rankThirds).map((t) => t.team)).toEqual([
      "TopPts", // most points
      "BigGD", // +9 GD
      "MidGD", // +4 GD
      "MoreGoals", // +1 GD, 4 goals
      "Alpha", // +1 GD, 2 goals, name before Bravo
      "Bravo",
    ])
  })
})
