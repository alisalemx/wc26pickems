import { useMemo } from "react"
import { motion, useReducedMotion } from "motion/react"
import { useAuth } from "@/hooks/useAuth"
import { useLeaderboard, useMatches } from "@/hooks/queries"
import { competitionRanks } from "@/lib/rank"
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
import { remainingMaxPoints } from "@/lib/scoring"
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
  // Standard competition ranking: fully tied rows share a rank (e.g. two
  // players tied at 1st both show 🥇, the next player is 3rd).
  const ranks = useMemo(() => competitionRanks(data ?? []), [data])
  const remainingPoints = useMemo(
    () => remainingMaxPoints(matches ?? []),
    [matches]
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span>🏆</span> Leaderboard
        </CardTitle>
        <ScoringGuide />
      </CardHeader>
      <CardContent className="px-2 sm:px-5">
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
                  className={cn(
                    COLS,
                    "border-b px-1 py-2 text-sm last:border-b-0",
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
  )
}
