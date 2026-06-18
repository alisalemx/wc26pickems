import { useMemo, useState, type CSSProperties } from "react"
import { Info } from "lucide-react"
import { useMatches, useStandings } from "@/hooks/queries"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ListSkeleton } from "@/components/ListSkeleton"
import { TeamDisplay } from "@/components/TeamDisplay"
import { TeamDetailDialog } from "@/components/TeamInfoDialog"
import { Bracket } from "@/components/Bracket"
import { computeGroup, rankThirds, type Standing } from "@/lib/standings"
import type { GroupStandingRow, MatchRow } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Convert synced standings rows into the per-group ordered tables the UI
 *  renders, preserving football-data's official `position` order (which encodes
 *  FIFA's fair-play tiebreaker). */
function groupsFromStandings(
  rows: GroupStandingRow[]
): { name: string; rows: Standing[] }[] {
  const byGroup = new Map<string, Standing[]>()
  const sorted = [...rows].sort(
    (a, b) =>
      a.group_name.localeCompare(b.group_name) || a.position - b.position
  )
  for (const r of sorted) {
    if (!byGroup.has(r.group_name)) byGroup.set(r.group_name, [])
    byGroup.get(r.group_name)!.push({
      team: r.team_name ?? r.team_code ?? "—",
      code: r.team_code,
      p: r.played,
      w: r.won,
      d: r.drawn,
      l: r.lost,
      gf: r.gf,
      ga: r.ga,
      pts: r.points,
    })
  }
  return [...byGroup.entries()].map(([name, rows]) => ({ name, rows }))
}

function Groups() {
  const { data: matches, isLoading: matchesLoading } = useMatches()
  const { data: standings, isLoading: standingsLoading } = useStandings()

  const { groups, qualifyingThirds, thirdsComparable } = useMemo(() => {
    // Fixtures grouped — used for the comparability gate below, and as the
    // fallback table source until the standings table is first synced.
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

    // Prefer football-data's official order (it applies the fair-play tiebreaker
    // we can't compute); fall back to our client-side table until it's synced.
    const groups =
      standings && standings.length
        ? groupsFromStandings(standings)
        : [...byGroup.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([name, ms]) => ({ name, rows: computeGroup(ms) }))

    // The 8 best third-placed teams across all groups also advance to the R32.
    const thirds = groups
      .map((g) => g.rows[2])
      .filter((r): r is Standing => Boolean(r))
      .sort(rankThirds)
    const qualifyingThirds = new Set(
      thirds.slice(0, 8).map((r) => r.code ?? r.team)
    )

    // Comparable only when every group has played the same number of games (and
    // at least one): then the thirds are ranked on equal footing. While a round
    // is mid-flight the counts differ, so the highlight hides until groups level
    // out again (it re-appears live as the final matchday completes).
    const counts = [...byGroup.keys()].map((name) => finishedByGroup.get(name) ?? 0)
    const thirdsComparable =
      counts.length > 0 && counts[0] > 0 && counts.every((c) => c === counts[0])

    return { groups, qualifyingThirds, thirdsComparable }
  }, [matches, standings])

  // Wait for the official standings before first paint, not just for matches.
  // The matches query is usually warm (shared with the Matches page) while
  // standings is cold, so rendering on matches alone would flash the client-side
  // fallback order and then snap to football-data's official order a beat later
  // (the two disagree on tiebreakers and on counting in-progress matches). Gating
  // on isLoading only affects the very first load — background 60s refetches keep
  // their previous data, so this never re-flashes the skeleton.
  if (matchesLoading || standingsLoading) {
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

      <div className="grid gap-3 sm:grid-cols-2">
      {groups.map((g, i) => (
        <Card
          key={g.name}
          className="gap-1.5 animate-in fade-in-0 slide-in-from-bottom-2 duration-[var(--duration-base)] ease-out-cubic stagger-in"
          style={{ "--i": i } as CSSProperties}
        >
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
                  <StandingRow
                    key={r.team}
                    r={r}
                    highlight={cn(
                      i < 2 && "bg-primary/5",
                      i === 2 &&
                        thirdsComparable &&
                        qualifyingThirds.has(r.code ?? r.team) &&
                        "bg-amber-500/10"
                    )}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
      </div>
    </div>
  )
}

/** One standings row. The whole row opens the team modal; the info icon stays
 *  as a visual affordance. */
function StandingRow({ r, highlight }: { r: Standing; highlight: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <TableRow
        onClick={() => setOpen(true)}
        className={cn("cursor-pointer", highlight)}
      >
        <TableCell>
          <div className="flex items-center gap-1">
            <TeamDisplay name={r.team} code={r.code} size="sm" />
            <Info className="size-3.5 text-muted-foreground" aria-hidden />
          </div>
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
      <TeamDetailDialog
        name={r.team}
        code={r.code}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

export function Tournament() {
  return (
    <Tabs defaultValue="groups" className="gap-3">
      <TabsList className="w-full">
        <TabsTrigger value="groups">Groups</TabsTrigger>
        <TabsTrigger value="bracket">Bracket</TabsTrigger>
      </TabsList>
      <TabsContent value="groups">
        <Groups />
      </TabsContent>
      <TabsContent value="bracket">
        <Bracket />
      </TabsContent>
    </Tabs>
  )
}
