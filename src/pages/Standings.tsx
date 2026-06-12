import { useMemo } from "react"
import { useMatches } from "@/hooks/queries"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ListSkeleton } from "@/components/ListSkeleton"
import { TeamDisplay } from "@/components/TeamDisplay"
import type { MatchRow } from "@/lib/types"
import { cn } from "@/lib/utils"

interface Standing {
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

function computeGroup(matches: MatchRow[]): Standing[] {
  const table = new Map<string, Standing>()
  const ensure = (team: string, code: string | null) => {
    if (!table.has(team))
      table.set(team, {
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
    return table.get(team)!
  }

  for (const m of matches) {
    if (!m.home_team || !m.away_team) continue
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

  return [...table.values()].sort(
    (x, y) =>
      y.pts - x.pts ||
      y.gf - y.ga - (x.gf - x.ga) ||
      y.gf - x.gf ||
      x.team.localeCompare(y.team)
  )
}

// Cross-group ordering of teams: points, then goal difference, then goals
// scored, then name as a stable fallback. Mirrors the per-group sort and is the
// same simplification — the real tournament has further tiebreakers (head-to-
// head, disciplinary, drawing of lots) we can't compute client-side.
function rankThirds(x: Standing, y: Standing): number {
  return (
    y.pts - x.pts ||
    y.gf - y.ga - (x.gf - x.ga) ||
    y.gf - x.gf ||
    x.team.localeCompare(y.team)
  )
}

export function Standings() {
  const { data: matches, isLoading } = useMatches()

  const { groups, qualifyingThirds, thirdsComparable } = useMemo(() => {
    const byGroup = new Map<string, MatchRow[]>()
    const finishedByGroup = new Map<string, number>()
    for (const m of matches ?? []) {
      if (m.stage !== "GROUP" || !m.group_name) continue
      if (!byGroup.has(m.group_name)) byGroup.set(m.group_name, [])
      byGroup.get(m.group_name)!.push(m)
      if (m.status === "FINISHED" && m.home_score != null) {
        finishedByGroup.set(
          m.group_name,
          (finishedByGroup.get(m.group_name) ?? 0) + 1
        )
      }
    }

    const groups = [...byGroup.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, ms]) => ({ name, rows: computeGroup(ms) }))

    // The 8 best third-placed teams across all groups also advance to the R32.
    const thirds = groups
      .map((g) => g.rows[2])
      .filter((r): r is Standing => Boolean(r))
      .sort(rankThirds)
    const qualifyingThirds = new Set(thirds.slice(0, 8).map((r) => r.team))

    // Comparable only when every group has played the same number of games (and
    // at least one): then the thirds are ranked on equal footing. While a round
    // is mid-flight the counts differ, so the highlight hides until groups level
    // out again (it re-appears live as the final matchday completes).
    const counts = [...byGroup.keys()].map((name) => finishedByGroup.get(name) ?? 0)
    const thirdsComparable =
      counts.length > 0 && counts[0] > 0 && counts.every((c) => c === counts[0])

    return { groups, qualifyingThirds, thirdsComparable }
  }, [matches])

  if (isLoading) {
    return (
      <ListSkeleton
        count={4}
        className="grid gap-3 sm:grid-cols-2"
        itemClassName="h-48 w-full"
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
      {groups.map((g) => (
        <Card key={g.name} className="gap-1.5">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Group {g.name}</CardTitle>
          </CardHeader>
          <CardContent className="px-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-full">Team</TableHead>
                  <TableHead className="text-center">P</TableHead>
                  <TableHead className="text-center">GD</TableHead>
                  <TableHead className="text-center">Pts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {g.rows.map((r, i) => (
                  <TableRow
                    key={r.team}
                    className={cn(
                      i < 2 && "bg-primary/5",
                      i === 2 &&
                        thirdsComparable &&
                        qualifyingThirds.has(r.team) &&
                        "bg-amber-500/10"
                    )}
                  >
                    <TableCell>
                      <TeamDisplay name={r.team} code={r.code} size="sm" />
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-muted-foreground">
                      {r.p}
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-muted-foreground">
                      {r.gf - r.ga > 0 ? "+" : ""}
                      {r.gf - r.ga}
                    </TableCell>
                    <TableCell className="text-center font-semibold tabular-nums">
                      {r.pts}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-primary/30" />
          Top 2 qualify
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-amber-500/40" />
          Best 8 third-place teams advance
        </span>
      </div>
    </div>
  )
}
