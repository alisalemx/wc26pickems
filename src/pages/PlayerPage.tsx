import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import {
  useLeaderboard,
  useMatches,
  usePlayerScoredPredictions,
} from "@/hooks/queries"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/EmptyState"
import { SignHeading } from "@/components/SignHeading"
import { PickRow, RankSummary, SettledList } from "@/components/PlayerSummary"
import { RESULT_FILTERS, type ResultFilter } from "@/lib/filters"
import { resolveKnockoutTeams } from "@/lib/bracket"
import { competitionRanks } from "@/lib/rank"
import { SegmentedControl } from "@/components/SegmentedControl"

export function PlayerPage() {
  const { userId } = useParams<{ userId: string }>()
  const { session } = useAuth()
  const { data: rawMatches, isLoading: matchesLoading } = useMatches()
  const matches = useMemo(
    () => (rawMatches ? resolveKnockoutTeams(rawMatches) : rawMatches),
    [rawMatches]
  )
  const matchById = useMemo(() => {
    const map = new Map<number, NonNullable<typeof matches>[number]>()
    for (const m of matches ?? []) map.set(m.id, m)
    return map
  }, [matches])

  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard()
  const { data: scoredRows, isLoading: scoredLoading } =
    usePlayerScoredPredictions(userId)

  const isLoading = matchesLoading || leaderboardLoading || scoredLoading

  const playerRow = useMemo(
    () => leaderboard?.find((r) => r.user_id === userId),
    [leaderboard, userId]
  )

  const rank = useMemo(() => {
    if (!leaderboard || !userId || !playerRow) return null
    if ((leaderboard[0]?.total_points ?? 0) === 0) return null
    const idx = leaderboard.findIndex((r) => r.user_id === userId)
    if (idx === -1) return null
    const ranks = competitionRanks(leaderboard)
    return { position: ranks[idx], total: leaderboard.length }
  }, [leaderboard, userId, playerRow])

  const settled = useMemo(() => {
    if (!scoredRows) return []
    return scoredRows
      .filter((r) => r.result_type != null)
      .sort((a, b) => +new Date(b.kickoff) - +new Date(a.kickoff))
  }, [scoredRows])

  const counts = useMemo(() => {
    const c = { all: settled.length, EXACT: 0, OUTCOME: 0, MISS: 0 }
    for (const r of settled) {
      if (r.result_type) c[r.result_type]++
    }
    return c
  }, [settled])

  const [filter, setFilter] = useState<ResultFilter>("all")

  const filtered = useMemo(
    () =>
      filter === "all"
        ? settled
        : settled.filter((r) => r.result_type === filter),
    [settled, filter]
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-20 w-56 rounded-xl" />
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[24rem_minmax(0,1fr)]">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (!playerRow) {
    return (
      <Card>
        <CardContent>
          <EmptyState className="py-12">Player not found.</EmptyState>
        </CardContent>
      </Card>
    )
  }

  const isSelf = userId === session?.user.id

  const filterControl = settled.length > 0 && (
    <SegmentedControl
      layoutId="player-filter-active"
      value={filter}
      onChange={setFilter}
      options={RESULT_FILTERS.map((f) => ({
        value: f.value,
        label: (
          <>
            {f.label}
            <span className="ml-1 text-[11px] tabular-nums opacity-60 max-[359px]:hidden sm:ml-1.5 sm:text-xs">
              {counts[f.value]}
            </span>
          </>
        ),
      }))}
    />
  )

  return (
    <div className="flex flex-col gap-4">
      <SignHeading
        as="h1"
        size="lg"
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            @{playerRow.username}
            {isSelf && <Badge variant="default">You</Badge>}
          </span>
        }
        sub="Revealed picks"
        className="px-1 sm:px-0"
      />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <RankSummary
          rank={rank}
          className="lg:sticky lg:top-20"
          stats={[
            { label: "Total points", value: playerRow.total_points },
            { label: "Exact scores", value: playerRow.exact_count },
            { label: "Revealed picks", value: settled.length },
          ]}
        />

        <SettledList
          title="Settled picks"
          filter={filterControl}
          empty={
            settled.length === 0 ? (
              <EmptyState className="py-8">
                No revealed picks yet. Picks appear here after kickoff.
              </EmptyState>
            ) : filtered.length === 0 ? (
              <EmptyState className="py-8">
                No{" "}
                {RESULT_FILTERS.find((f) => f.value === filter)?.label.toLowerCase()}{" "}
                results yet.
              </EmptyState>
            ) : undefined
          }
        >
          {filtered.map((r, i) => {
            const m = matchById.get(r.match_id)
            if (!m) return null
            return (
              <PickRow
                key={r.match_id}
                match={m}
                homePred={r.home_pred}
                awayPred={r.away_pred}
                result={r.result_type}
                points={r.points ?? 0}
                index={i}
              />
            )
          })}
        </SettledList>
      </div>
    </div>
  )
}
