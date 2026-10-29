import { useMemo, useState, type CSSProperties } from "react"
import { useMatches, useStandings } from "@/hooks/queries"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
import { Bullet } from "@/components/Bullet"
import { SignHeading } from "@/components/SignHeading"
import { TeamDisplay } from "@/components/TeamDisplay"
import { TeamDetailDialog } from "@/components/TeamInfoDialog"
import { Bracket } from "@/components/Bracket"
import {
  computeGroup,
  rankThirds,
  type PositionLookup,
  type Standing,
} from "@/lib/standings"
import { entranceClasses, switchEntrance, type Entrance } from "@/lib/entrance"
import type { MatchRow } from "@/lib/types"
import { cn } from "@/lib/utils"

/** The group tables. `entrance` is how its cards arrive: the cascade on the
 *  page's first load, or the lighter switch entrance (src/lib/entrance.ts). */
function Groups({ entrance }: { entrance: Entrance }) {
  const { data: matches, isLoading: matchesLoading } = useMatches()
  const { data: standings, isLoading: standingsLoading } = useStandings()

  const { groups, qualifyingThirds, thirdsComparable } = useMemo(() => {
    // Group the fixtures. This is the source the table is computed from — our own
    // live `matches` feed — so the standings always agree with the scores shown
    // on the match list and move "as it happens", instead of lagging the
    // separately-cadenced football-data /standings endpoint.
    const byGroup = new Map<string, MatchRow[]>()
    for (const m of matches ?? []) {
      if (m.stage !== "GROUP" || !m.group_name) continue
      if (!byGroup.has(m.group_name)) byGroup.set(m.group_name, [])
      byGroup.get(m.group_name)!.push(m)
    }

    // football-data's official standings encode FIFA's fair-play / drawing-of-lots
    // tiebreaker we can't compute. We don't render its order verbatim (it lags our
    // live results); we use it only as a position lookup that breaks ties our own
    // table leaves genuinely level. Keyed by code, with a name fallback.
    const posByGroup = new Map<
      string,
      { byCode: Map<string, number>; byName: Map<string, number> }
    >()
    for (const r of standings ?? []) {
      let e = posByGroup.get(r.group_name)
      if (!e) {
        e = { byCode: new Map(), byName: new Map() }
        posByGroup.set(r.group_name, e)
      }
      if (r.team_code) e.byCode.set(r.team_code, r.position)
      if (r.team_name) e.byName.set(r.team_name, r.position)
    }

    const groups = [...byGroup.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, ms]) => {
        const pos = posByGroup.get(name)
        const positionOf: PositionLookup | undefined = pos
          ? (s) =>
              (s.code != null ? pos.byCode.get(s.code) : undefined) ??
              pos.byName.get(s.team)
          : undefined
        return { name, rows: computeGroup(ms, positionOf) }
      })

    // The 8 best third-placed teams across all groups also advance to the R32.
    const thirds = groups
      .map((g) => g.rows[2])
      .filter((r): r is Standing => Boolean(r))
      .sort(rankThirds)
    const qualifyingThirds = new Set(
      thirds.slice(0, 8).map((r) => r.code ?? r.team)
    )

    // Show the best-thirds race live ("as it happens"): rank the third-placed
    // teams as results land rather than waiting for every group to level out on
    // games played. The only gate is that all 12 groups have a third-placed team
    // that has actually played a match — so we never highlight a team before it
    // has a result on the board. Mid-stage the ranking is provisional (a team that
    // has played fewer games may still climb), settling into the real cut-off as
    // the final matchday completes.
    const thirdsComparable =
      thirds.length >= 12 && thirds.every((r) => r.p > 0)

    return { groups, qualifyingThirds, thirdsComparable }
  }, [matches, standings])

  // Wait for the official standings before first paint, not just for matches.
  // The table is computed from matches, but football-data's positions break ties
  // we can't compute, so a first paint on matches alone could place genuinely
  // level teams by name and then reorder a beat later when standings arrives.
  // The matches query is usually warm (shared with the Matches page) while
  // standings is cold, so gate on both to avoid that flash. This only affects the
  // very first load — background 60s refetches keep their previous data, so the
  // skeleton never re-appears.
  if (matchesLoading || standingsLoading) {
    return (
      <ListSkeleton
        count={4}
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        itemClassName="h-60 w-full rounded-xl"
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* The legend uses the same position bullets as the tables. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <Bullet tone="signal" size="xs">1</Bullet>
          Top 2 qualify
        </span>
        <span className="flex items-center gap-2">
          <Bullet tone="win" size="xs">3</Bullet>
          Best 8 third-place teams advance
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {groups.map((g, i) => (
          <Card
            key={g.name}
            className={cn(
              "gap-2 pb-3",
              entranceClasses(
                entrance,
                "animate-in fade-in-0 slide-in-from-bottom-2 animation-duration-[var(--duration-base)] ease-out-cubic stagger-in"
              )
            )}
            style={{ "--i": i } as CSSProperties}
          >
            <CardHeader>
              <SignHeading title={`Group ${g.name}`} size="sm" as="h3" />
            </CardHeader>
            <CardContent className="px-2 sm:px-3">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-full pl-2">Team</TableHead>
                    <TableHead className="text-center">P</TableHead>
                    <TableHead className="text-center">GD</TableHead>
                    <TableHead className="pr-3 text-right">Pts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {g.rows.map((r, i) => (
                    <StandingRow
                      key={r.team}
                      r={r}
                      position={i + 1}
                      tone={
                        i < 2
                          ? "signal"
                          : i === 2 &&
                              thirdsComparable &&
                              qualifyingThirds.has(r.code ?? r.team)
                            ? "win"
                            : "muted"
                      }
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

/** One standings row: the position as a line bullet (green for the top two,
 *  pale green for a qualifying third), then the team. The whole row opens the
 *  team modal. */
function StandingRow({
  r,
  position,
  tone,
}: {
  r: Standing
  position: number
  tone: "signal" | "win" | "muted"
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <TableRow
        role="button"
        tabIndex={0}
        aria-label={`View ${r.team} details`}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className="h-12 cursor-pointer border-0 transition-colors duration-[var(--duration-fast)] hover:bg-accent active:bg-accent-pressed focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&>td:first-child]:rounded-l-lg [&>td:last-child]:rounded-r-lg"
      >
        <TableCell className="max-w-0 pl-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Bullet tone={tone} size="xs" label={`Position ${position}`}>
              {position}
            </Bullet>
            <TeamDisplay name={r.team} code={r.code} size="sm" className="min-w-0" />
          </div>
        </TableCell>
        <TableCell className="text-center tabular-nums text-muted-foreground">
          {r.p}
        </TableCell>
        <TableCell className="text-center tabular-nums text-muted-foreground">
          {r.gf - r.ga > 0 ? "+" : ""}
          {r.gf - r.ga}
        </TableCell>
        <TableCell className="pr-3 text-right font-bold tabular-nums">
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

/** Whether the tournament has progressed into the knockout stage. True once any
 *  knockout match has kicked off, or once every group match has finished — so the
 *  Bracket becomes the default view the moment the group stage concludes, even in
 *  the day-or-two gap before the Round of 32 kicks off. (The all-group-finished
 *  clause also makes a postponed knockout fixture harmless: a kicked-off knockout
 *  match isn't required.) */
function reachedKnockout(matches: MatchRow[]): boolean {
  const now = Date.now()
  let sawGroup = false
  let allGroupFinished = true
  for (const m of matches) {
    if (m.stage === "GROUP") {
      sawGroup = true
      if (m.status !== "FINISHED") allGroupFinished = false
    } else if (new Date(m.kickoff).getTime() <= now) {
      return true
    }
  }
  return sawGroup && allGroupFinished
}

export function Tournament() {
  const { data: matches } = useMatches()
  // The tab is derived, not stored: a user's explicit pick (`chosen`) wins, but
  // until they choose one we default from tournament state — Bracket once the
  // knockout stage is under way, Groups otherwise. Controlled (not `defaultValue`)
  // so the default reacts to the async matches query; deriving during render (no
  // effect) means the warm-cache case (the matches query is usually already
  // populated from the Matches page) lands on the right tab with no flicker.
  const [chosen, setChosen] = useState<string | null>(null)
  // The first tab shown cascades in; a later switch uses the lighter entrance.
  const [entrance, setEntrance] = useState<Entrance>("cascade")
  const tab =
    chosen ??
    (matches ? (reachedKnockout(matches) ? "bracket" : "groups") : undefined)

  if (tab === undefined) {
    return (
      <ListSkeleton
        count={4}
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        itemClassName="h-60 w-full rounded-xl"
      />
    )
  }

  return (
    <Tabs
      value={tab}
      onValueChange={(v, { keyboard }) => {
        setChosen(v)
        setEntrance(switchEntrance(keyboard))
      }}
      className="gap-4"
    >
      <TabsList className="w-full md:w-80">
        <TabsTrigger value="groups">Groups</TabsTrigger>
        <TabsTrigger value="bracket">Bracket</TabsTrigger>
      </TabsList>
      <TabsContent value="groups">
        <Groups entrance={entrance} />
      </TabsContent>
      <TabsContent value="bracket">
        <Bracket entrance={entrance} />
      </TabsContent>
    </Tabs>
  )
}
