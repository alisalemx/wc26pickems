import type { MatchRow } from "./types"

export interface Standing {
  team: string
  code: string | null
  p: number
  w: number
  d: number
  l: number
  gf: number
  ga: number
  pts: number
}

const blank = (team: string, code: string | null): Standing => ({
  team,
  code,
  p: 0,
  w: 0,
  d: 0,
  l: 0,
  gf: 0,
  ga: 0,
  pts: 0,
})

const gd = (s: Standing) => s.gf - s.ga

/** Compare two records by the first three FIFA criteria — points, then goal
 *  difference, then goals scored. Returns <0 when `a` outranks `b`, 0 when level
 *  on all three (no fallback applied here). */
function byMetrics(a: Standing, b: Standing): number {
  return b.pts - a.pts || gd(b) - gd(a) || b.gf - a.gf
}

/** Deterministic last resort. FIFA's remaining tiebreakers after head-to-head
 *  are fair-play (disciplinary) points and then a drawing of lots — neither is
 *  computable here (we store no cards, and lots are random). Alphabetical keeps
 *  the table from reshuffling between refetches when teams are genuinely level. */
const byName = (a: Standing, b: Standing) => a.team.localeCompare(b.team)

/** Accumulate W/D/L, goals, and points from finished matches. With `subset`,
 *  only matches between two teams that are *both* in the subset count — a FIFA
 *  head-to-head "mini-table" — and only those teams get rows. Without it, every
 *  team named in any match (finished or not) gets a row so the table is complete
 *  before kickoff. */
function accumulate(
  matches: MatchRow[],
  subset?: Set<string>
): Map<string, Standing> {
  const table = new Map<string, Standing>()
  const ensure = (team: string, code: string | null) => {
    let s = table.get(team)
    if (!s) {
      s = blank(team, code)
      table.set(team, s)
    } else if (s.code == null && code != null) {
      s.code = code
    }
    return s
  }

  for (const m of matches) {
    if (!m.home_team || !m.away_team) continue
    if (subset && !(subset.has(m.home_team) && subset.has(m.away_team))) continue
    const h = ensure(m.home_team, m.home_code)
    const a = ensure(m.away_team, m.away_code)
    if (m.status !== "FINISHED" || m.home_score == null || m.away_score == null)
      continue
    h.p++
    a.p++
    h.gf += m.home_score
    h.ga += m.away_score
    a.gf += m.away_score
    a.ga += m.home_score
    if (m.home_score > m.away_score) {
      h.w++
      a.l++
      h.pts += 3
    } else if (m.home_score < m.away_score) {
      a.w++
      h.l++
      a.pts += 3
    } else {
      h.d++
      a.d++
      h.pts++
      a.pts++
    }
  }
  return table
}

/** Resolve a set of teams that are level on the overall criteria using the FIFA
 *  head-to-head sequence: build a mini-table from only the matches between these
 *  teams and rank by its points, goal difference, then goals scored. Any subset
 *  that is *still* level is re-evaluated with the same procedure restricted to
 *  just those teams (criterion g) — recursion that terminates because the subset
 *  strictly shrinks. A set that can't be separated (they haven't all met, or the
 *  results form a cycle) falls back to name order. */
function breakHeadToHead(cluster: Standing[], matches: MatchRow[]): Standing[] {
  const names = new Set(cluster.map((s) => s.team))
  const mini = accumulate(matches, names)
  const rec = (s: Standing) => mini.get(s.team) ?? blank(s.team, s.code)
  const sorted = [...cluster].sort((a, b) => byMetrics(rec(a), rec(b)))

  const out: Standing[] = []
  for (let i = 0; i < sorted.length; ) {
    let j = i + 1
    while (j < sorted.length && byMetrics(rec(sorted[i]), rec(sorted[j])) === 0)
      j++
    const sub = sorted.slice(i, j)
    if (sub.length === 1) {
      out.push(sub[0])
    } else if (sub.length === cluster.length) {
      // The mini-table separated nobody → head-to-head is exhausted for this set.
      out.push(...[...sub].sort(byName))
    } else {
      // A strict subset is still level → re-apply head-to-head to just them.
      out.push(...breakHeadToHead(sub, matches))
    }
    i = j
  }
  return out
}

/** Group standings ordered by the full FIFA ruleset we can compute: points,
 *  goal difference, goals scored, then head-to-head (mini-table points / GD /
 *  goals, applied recursively) among any teams still level, then name as the
 *  stable stand-in for the uncomputable fair-play / drawing-of-lots steps. */
export function computeGroup(matches: MatchRow[]): Standing[] {
  const overall = [...accumulate(matches).values()].sort(byMetrics)

  const out: Standing[] = []
  for (let i = 0; i < overall.length; ) {
    let j = i + 1
    while (j < overall.length && byMetrics(overall[i], overall[j]) === 0) j++
    const cluster = overall.slice(i, j)
    out.push(...(cluster.length === 1 ? cluster : breakHeadToHead(cluster, matches)))
    i = j
  }
  return out
}

/** Rank third-placed teams across groups. FIFA orders them by points, goal
 *  difference, goals scored, then fair-play points, then drawing of lots — and
 *  there is no head-to-head because they sit in different groups. We compute the
 *  first three; name stands in for the rest (see {@link byName}). */
export function rankThirds(x: Standing, y: Standing): number {
  return byMetrics(x, y) || byName(x, y)
}
