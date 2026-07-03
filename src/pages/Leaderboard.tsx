import { useMemo } from "react"
import { motion, useReducedMotion } from "motion/react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import {
  useAllScoredPredictions,
  useLeaderboard,
  useMatches,
} from "@/hooks/queries"
import { tournamentChampion } from "@/lib/bracket"
import { competitionRanks } from "@/lib/rank"
import {
  pickBestSingleCall,
  pickEverPresent,
  pickSharpshooters,
  type NamedExactCall,
} from "@/lib/awards"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/EmptyState"
import { ListSkeleton } from "@/components/ListSkeleton"
import { ScoringGuide } from "@/components/ScoringGuide"
import { remainingMaxPoints, STAGE_LABEL } from "@/lib/scoring"
import { cn } from "@/lib/utils"

const MEDALS = ["🥇", "🥈", "🥉"]

// Shared grid template — mirrors the old table-fixed columns (rank, player,
// exact, outcome, points). Kept identical between header and rows so they align.
const COLS =
  "grid grid-cols-[1.75rem_1fr_2.75rem_2.75rem_2.75rem] items-center gap-1"

export function Leaderboard() {
  const { session } = useAuth()
  const { data, isLoading } = useLeaderboard()
  const { data: matches } = useMatches()
  const reduceMotion = useReducedMotion()
  const navigate = useNavigate()
  // Standard competition ranking: fully tied rows share a rank (e.g. two
  // players tied at 1st both show 🥇, the next player is 3rd).
  const ranks = useMemo(() => competitionRanks(data ?? []), [data])
  const remainingPoints = useMemo(
    () => remainingMaxPoints(matches ?? []),
    [matches]
  )
  const champion = useMemo(
    () => tournamentChampion(matches ?? []),
    [matches]
  )
  const over = champion != null

  // Rank-1 players (competitionRanks shares a rank on a full tie), for the
  // league-winner line shown once the tournament is over.
  const winners = useMemo(
    () => (data ?? []).filter((_, i) => ranks[i] === 1),
    [data, ranks]
  )

  // League awards data only fetches once the tournament is over (`over`
  // gates the query itself, not just the render, so it costs nothing mid-season).
  const { data: allScored } = useAllScoredPredictions(over)
  const usernameById = useMemo(
    () => new Map((data ?? []).map((r) => [r.user_id, r.username])),
    [data]
  )
  const sharpshooters = useMemo(
    () => (over ? pickSharpshooters(data ?? []) : []),
    [over, data]
  )
  const everPresent = useMemo(
    () => (over ? pickEverPresent(data ?? []) : []),
    [over, data]
  )
  const bestCall = useMemo(() => {
    if (!over || !allScored) return null
    const named: NamedExactCall[] = allScored.map((r) => ({
      ...r,
      username: usernameById.get(r.user_id) ?? "player",
    }))
    return pickBestSingleCall(named)
  }, [over, allScored, usernameById])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span>🏆</span> {over ? "Final standings" : "Leaderboard"}
          </CardTitle>
          <ScoringGuide />
        </CardHeader>
        <CardContent className="px-2 sm:px-5">
          {over && winners.length > 0 && (
            <p className="mb-3 text-center text-sm font-medium text-foreground">
              🏆{" "}
              {winners.length === 1
                ? `@${winners[0].username} wins the league with ${winners[0].total_points} pts.`
                : `${winners
                    .map((w) => `@${w.username}`)
                    .join(", ")
                    .replace(/, ([^,]*)$/, " and $1")} share the title with ${winners[0].total_points} pts.`}
            </p>
          )}
          {isLoading ? (
            <ListSkeleton
              count={5}
              className="space-y-2"
              itemClassName="h-10 w-full"
            />
          ) : data?.length === 0 ? (
            <EmptyState className="py-8">No players yet.</EmptyState>
          ) : (
            <div>
              {/* Header row (static, not part of the reorder layout group) */}
              <div
                className={cn(
                  COLS,
                  "border-b px-1 pb-2 text-xs font-medium text-muted-foreground"
                )}
              >
                <span className="text-center">#</span>
                <span>Player</span>
                <span className="flex justify-center">
                  <Badge variant="gold" className="px-1 py-0 text-[10px]">
                    Exct
                  </Badge>
                </span>
                <span className="flex justify-center">
                  <Badge variant="default" className="px-1 py-0 text-[10px]">
                    Outc
                  </Badge>
                </span>
                <span className="text-center tracking-normal">Pts</span>
              </div>

              {data?.map((row, i) => {
                const isMe = row.user_id === session?.user.id
                const rank = ranks[i]
                return (
                  <motion.div
                    key={row.user_id}
                    layout
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : {
                            layout: {
                              type: "spring",
                              duration: 0.5,
                              bounce: 0.15,
                            },
                            opacity: {
                              duration: 0.18,
                              delay: Math.min(i, 8) * 0.03,
                            },
                            y: { duration: 0.18, delay: Math.min(i, 8) * 0.03 },
                          }
                    }
                    onClick={() => navigate(`/player/${row.user_id}`)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        if (e.key === " ") e.preventDefault()
                        navigate(`/player/${row.user_id}`)
                      }
                    }}
                    className={cn(
                      COLS,
                      "cursor-pointer border-b px-1 py-2 text-sm transition-colors last:border-b-0 hover:bg-muted/50 active:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-ring",
                      isMe && "bg-primary/10 border-l-2 border-l-primary"
                    )}
                  >
                    <span className="text-center font-medium">
                      {MEDALS[rank - 1] ?? rank}
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 truncate font-medium">
                        @{row.username}
                      </span>
                      {isMe && (
                        <Badge
                          variant="outline"
                          className="shrink-0 px-1 py-0 text-[10px]"
                        >
                          you
                        </Badge>
                      )}
                    </span>
                    <span className="text-center tabular-nums text-muted-foreground">
                      {row.exact_count}
                    </span>
                    <span className="text-center tabular-nums text-muted-foreground">
                      {row.outcome_count}
                    </span>
                    <span className="text-center font-semibold tabular-nums">
                      {row.total_points}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          )}
          {matches && remainingPoints > 0 && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Up to {remainingPoints} pts still up for grabs in the remaining
              matches.
            </p>
          )}
        </CardContent>
      </Card>

      {over && (
        <Card className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards duration-[var(--duration-base)] ease-out-cubic">
          <CardHeader>
            <CardTitle className="text-base">League awards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {sharpshooters.length === 0 && !bestCall && everPresent.length === 0 ? (
              <EmptyState className="py-6">Awards aren't in yet.</EmptyState>
            ) : (
              <>
                {sharpshooters.length > 0 && (
                  <p>
                    <span className="font-semibold">Sharpshooter:</span>{" "}
                    {sharpshooters
                      .map((s) => `@${s.username}`)
                      .join(", ")}{" "}
                    with {sharpshooters[0].exact_count} exact{" "}
                    {sharpshooters[0].exact_count === 1 ? "score" : "scores"}.
                  </p>
                )}
                {bestCall && (
                  <p>
                    <span className="font-semibold">Best single call:</span>{" "}
                    @{bestCall.username} called {bestCall.home_pred}-
                    {bestCall.away_pred} in the {STAGE_LABEL[bestCall.stage]},
                    +{bestCall.points} pts.
                  </p>
                )}
                {everPresent.length > 0 && (
                  <p>
                    <span className="font-semibold">Ever-present:</span>{" "}
                    {everPresent
                      .map((s) => `@${s.username}`)
                      .join(", ")}{" "}
                    with {everPresent[0].scored_count} scored{" "}
                    {everPresent[0].scored_count === 1
                      ? "prediction"
                      : "predictions"}
                    .
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
