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

export function Standings() {
  const { data: matches, isLoading } = useMatches()

  const groups = useMemo(() => {
    if (!matches) return []
    const byGroup = new Map<string, MatchRow[]>()
    for (const m of matches) {
      if (m.stage !== "GROUP" || !m.group_name) continue
      if (!byGroup.has(m.group_name)) byGroup.set(m.group_name, [])
      byGroup.get(m.group_name)!.push(m)
    }
    return [...byGroup.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, ms]) => ({ name, rows: computeGroup(ms) }))
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
    <div className="grid gap-3 sm:grid-cols-2">
      {groups.map((g) => (
        <Card key={g.name}>
          <CardHeader className="pb-2">
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
                  <TableRow key={r.team} className={cn(i < 2 && "bg-primary/5")}>
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
  )
}
