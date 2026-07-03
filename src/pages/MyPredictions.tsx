import { useMemo, useState, type CSSProperties } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useLeaderboard, useMatches, useMyPredictions } from "@/hooks/queries"
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
import { Skeleton } from "@/components/ui/skeleton"
import { flagEmoji } from "@/lib/flags"
import { resolveKnockoutTeams, tournamentChampion } from "@/lib/bracket"
import { ordinal } from "@/lib/format"
import { competitionRanks } from "@/lib/rank"
import { remainingMaxPoints, scorePrediction } from "@/lib/scoring"
import { cn } from "@/lib/utils"
import { SegmentedControl } from "@/components/SegmentedControl"
import type { ResultType } from "@/lib/types"

const MEDALS = ["🥇", "🥈", "🥉"]

// Settled-match filters in the Settled section. "all" plus the three
// ResultType buckets scorePrediction can return.
type ResultFilter = "all" | ResultType
const FILTERS: { value: ResultFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "OUTCOME", label: "Outcome" },
  { value: "EXACT", label: "Exact" },
  { value: "MISS", label: "Miss" },
]
// Metal fill matched to each medal emoji, defined in index.css (`.rank-metal-*`):
// a static base gradient (deep → bright → deep, sampled from Apple Color Emoji)
// under a moving sheen streak, both clipped to the rank text so "1st Place" reads
// as the same metal as its medal. 4th place and below fall back to neutral
// foreground (no class). Indexed by position - 1.
const TIER_GRADIENT = [
  "rank-metal rank-metal-gold", // 🥇 gold
  "rank-metal rank-metal-silver", // 🥈 silver
  "rank-metal rank-metal-bronze", // 🥉 bronze
]

export function MyPredictions() {
  const { session } = useAuth()
  const userId = session?.user.id
  const { data: rawMatches, isLoading } = useMatches()
  // Fill knockout TBD slots from feeders client-side (same as the match list)
  // so the team names stay consistent with the Matches tab.
  const matches = useMemo(
    () => (rawMatches ? resolveKnockoutTeams(rawMatches) : rawMatches),
    [rawMatches]
  )
  const { data: predictions } = useMyPredictions(userId)
  const { data: leaderboard } = useLeaderboard()

  // Position in the shared leaderboard query, using the same standard
  // competition ranking (shared position on a full tie) as the Leaderboard
  // page. Hidden until scoring has actually started (top score > 0), since
  // before any match is settled everyone is tied at zero and a rank would
  // just reflect arbitrary profile order.
  const rank = useMemo(() => {
    if (!leaderboard || !userId) return null
    if ((leaderboard[0]?.total_points ?? 0) === 0) return null
    const idx = leaderboard.findIndex((r) => r.user_id === userId)
    if (idx === -1) return null
    const ranks = competitionRanks(leaderboard)
    return { position: ranks[idx], total: leaderboard.length }
  }, [leaderboard, userId])

  // Medal gradient for the top 3; undefined (→ neutral text) for 4th and below.
  const rankGradient = rank ? TIER_GRADIENT[rank.position - 1] : undefined

  const stats = useMemo(() => {
    if (!matches || !predictions)
      return { made: 0, left: 0, points: 0, exact: 0, finished: 0 }
    let made = 0
    let left = 0
    let points = 0
    let exact = 0
    let finished = 0
    for (const m of matches) {
      const isFinished =
        m.status === "FINISHED" && m.home_score != null && m.away_score != null
      // "Matches left" = every fixture in the tournament not yet played to a
      // final result (upcoming or in progress), regardless of who's predicted it.
      if (!isFinished) left++
      const p = predictions[m.id]
      if (!p) continue
      made++
      if (isFinished) {
        finished++
        const s = scorePrediction(
          m.stage,
          p.home_pred,
          p.away_pred,
          m.home_score!,
          m.away_score!
        )
        points += s.points
        if (s.result === "EXACT") exact++
      }
    }
    return { made, left, points, exact, finished }
  }, [matches, predictions])

  const remainingPoints = useMemo(
    () => remainingMaxPoints(matches ?? []),
    [matches]
  )

  const champion = useMemo(
    () => tournamentChampion(matches ?? []),
    [matches]
  )

  const [filter, setFilter] = useState<ResultFilter>("all")

  const finishedWithPicks = useMemo(() => {
    if (!matches || !predictions) return []
    return matches
      .filter(
        (m) =>
          m.status === "FINISHED" &&
          m.home_score != null &&
          m.away_score != null &&
          predictions[m.id]
      )
      .sort((a, b) => +new Date(b.kickoff) - +new Date(a.kickoff))
      .map((m) => {
        const p = predictions[m.id]
        const scored = scorePrediction(
          m.stage,
          p.home_pred,
          p.away_pred,
          m.home_score!,
          m.away_score!
        )
        return { m, p, scored }
      })
  }, [matches, predictions])

  // Counts per bucket for the filter labels (computed once, not per-render).
  const counts = useMemo(() => {
    const c = { all: finishedWithPicks.length, EXACT: 0, OUTCOME: 0, MISS: 0 }
    for (const { scored } of finishedWithPicks) c[scored.result]++
    return c
  }, [finishedWithPicks])

  const filtered = useMemo(
    () =>
      filter === "all"
        ? finishedWithPicks
        : finishedWithPicks.filter(({ scored }) => scored.result === filter),
    [finishedWithPicks, filter]
  )

  // The viewer's boldest correct call: the EXACT pick worth the most points
  // (tie broken by latest kickoff — finishedWithPicks is already sorted
  // newest-first, so a strict `>` keeps the first, latest-kickoff match on a
  // points tie).
  const bestCall = useMemo(() => {
    let best: (typeof finishedWithPicks)[number] | undefined
    for (const item of finishedWithPicks) {
      if (item.scored.result !== "EXACT") continue
      if (!best || item.scored.points > best.scored.points) best = item
    }
    return best
  }, [finishedWithPicks])

  return (
    <div className="space-y-4">
      <Card className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards duration-[var(--duration-base)] ease-out-cubic">
        <CardContent>
          <div className="mb-1.5 text-center text-sm font-medium text-foreground">
            Your rank
          </div>
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <>
              {rank && (
                <div className="mb-4 text-center">
                  <div className="rank-pop flex items-center justify-center gap-1 leading-none">
                    {MEDALS[rank.position - 1] && (
                      <span className="text-3xl" aria-hidden="true">
                        {MEDALS[rank.position - 1]}
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-3xl font-semibold tabular-nums",
                        rankGradient
                          ? "bg-clip-text text-transparent [-webkit-background-clip:text] rank-sheen"
                          : "text-foreground",
                        rankGradient
                      )}
                    >
                      {ordinal(rank.position)} Place
                    </span>
                  </div>
                  <div className="mt-1.5 text-xs text-muted-foreground">
                    of {rank.total} {rank.total === 1 ? "player" : "players"}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 text-center">
                <StatCard label="Total points" value={stats.points} highlight />
                <StatCard label="Exact scores" value={stats.exact} />
                <StatCard label="Picks made" value={stats.made} />
              </div>
            </>
          )}
          {!champion && stats.left > 0 && (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              {stats.left} {stats.left === 1 ? "match" : "matches"} left in the
              tournament, up to {remainingPoints}{" "}
              {remainingPoints === 1 ? "pt" : "pts"} still up for grabs.
            </p>
          )}
          {champion && rank && (
            <div className="mt-4 border-t pt-3 text-center">
              <p className="text-sm font-medium">
                Tournament complete. You finished {ordinal(rank.position)} of{" "}
                {rank.total}.
              </p>
              {bestCall && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Best call: {bestCall.m.home_team} {bestCall.m.home_score}-
                  {bestCall.m.away_score} {bestCall.m.away_team}, +
                  {bestCall.scored.points} pts
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="gap-3 animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards duration-[var(--duration-base)] ease-out-cubic">
        <CardHeader>
          <CardTitle className="text-base">Settled matches</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {finishedWithPicks.length > 0 && (
            <SegmentedControl
              layoutId="me-filter-active"
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
          {finishedWithPicks.length === 0 && (
            <EmptyState className="py-6">
              No results scored yet. Check back after kickoff!
            </EmptyState>
          )}
          {finishedWithPicks.length > 0 && filtered.length === 0 && (
            <EmptyState className="py-6">
              No {FILTERS.find((f) => f.value === filter)?.label.toLowerCase()}{" "}
              results yet.
            </EmptyState>
          )}
          {filtered.map(({ m, p, scored: s }, i) => {
            return (
              <div
                key={m.id}
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
                    pick {p.home_pred}–{p.away_pred}
                  </Badge>
                  <ResultBadge result={s.result} points={s.points} />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
