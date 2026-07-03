import { useMemo, useState, type CSSProperties } from "react"
import { useParams } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import {
  useLeaderboard,
  useMatches,
  usePlayerScoredPredictions,
} from "@/hooks/queries"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ResultBadge } from "@/components/ResultBadge"
import { StageBadge } from "@/components/StageBadge"
import { StatCard } from "@/components/StatCard"
import { EmptyState } from "@/components/EmptyState"
import { ListSkeleton } from "@/components/ListSkeleton"
import { flagEmoji } from "@/lib/flags"
import { resolveKnockoutTeams } from "@/lib/bracket"
import { ordinal } from "@/lib/format"
import { competitionRanks } from "@/lib/rank"
import { SegmentedControl } from "@/components/SegmentedControl"
import type { ResultType } from "@/lib/types"

const MEDALS = ["🥇", "🥈", "🥉"]

// Settled-match filters, same idiom as MyPredictions.
type ResultFilter = "all" | ResultType
const FILTERS: { value: ResultFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "OUTCOME", label: "Outcome" },
  { value: "EXACT", label: "Exact" },
  { value: "MISS", label: "Miss" },
]

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
      <div className="space-y-4">
        <Card>
          <CardContent>
            <ListSkeleton
              count={1}
              className="space-y-3"
              itemClassName="h-24 w-full"
            />
          </CardContent>
        </Card>
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

  return (
    <div className="space-y-4">
      <Card className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards duration-[var(--duration-base)] ease-out-cubic">
        <CardContent>
          <div className="mb-1.5 flex items-center justify-center gap-2 text-center text-sm font-medium text-foreground">
            <span>@{playerRow.username}</span>
            {isSelf && (
              <Badge variant="outline" className="px-1 py-0 text-[10px]">
                you
              </Badge>
            )}
          </div>
          {rank && (
            <div className="mb-4 text-center">
              <div className="flex items-center justify-center gap-1 leading-none">
                {MEDALS[rank.position - 1] && (
                  <span className="text-3xl" aria-hidden="true">
                    {MEDALS[rank.position - 1]}
                  </span>
                )}
                <span className="text-3xl font-semibold tabular-nums text-foreground">
                  {ordinal(rank.position)} Place
                </span>
              </div>
              <div className="mt-1.5 text-xs text-muted-foreground">
                of {rank.total} {rank.total === 1 ? "player" : "players"}
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3 text-center">
            <StatCard
              label="Total points"
              value={playerRow.total_points}
              highlight
            />
            <StatCard label="Exact scores" value={playerRow.exact_count} />
            <StatCard label="Revealed picks" value={settled.length} />
          </div>
        </CardContent>
      </Card>

      <Card className="gap-3 animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards duration-[var(--duration-base)] ease-out-cubic">
        <CardHeader>
          <CardTitle className="text-base">Settled picks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {settled.length > 0 && (
            <SegmentedControl
              layoutId="player-filter-active"
              value={filter}
              onChange={setFilter}
              options={FILTERS.map((f) => ({
                value: f.value,
                label: (
                  <>
                    {f.label}
                    <span className="ml-1 text-xs tabular-nums opacity-60">
                      {counts[f.value]}
                    </span>
                  </>
                ),
              }))}
            />
          )}
          {settled.length === 0 && (
            <EmptyState className="py-6">
              No revealed picks yet. Picks appear here after kickoff.
            </EmptyState>
          )}
          {settled.length > 0 && filtered.length === 0 && (
            <EmptyState className="py-6">
              No {FILTERS.find((f) => f.value === filter)?.label.toLowerCase()}{" "}
              results yet.
            </EmptyState>
          )}
          {filtered.map((r, i) => {
            const m = matchById.get(r.match_id)
            if (!m) return null
            return (
              <div
                key={r.match_id}
                className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm animate-in fade-in-0 slide-in-from-bottom-1 duration-[var(--duration-base)] ease-out-cubic stagger-in"
                style={{ "--i": i } as CSSProperties}
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <StageBadge
                    stage={m.stage}
                    group={m.group_name}
                    className="w-fit"
                  />
                  <span className="truncate">
                    {flagEmoji(m.home_code)} {m.home_team} {m.home_score}–
                    {m.away_score} {m.away_team} {flagEmoji(m.away_code)}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="secondary" className="tabular-nums">
                    pick {r.home_pred}–{r.away_pred}
                  </Badge>
                  {r.result_type && (
                    <ResultBadge result={r.result_type} points={r.points ?? 0} />
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
