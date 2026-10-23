import { useMemo } from "react"
import { motion, useReducedMotion } from "motion/react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { useLeaderboard, useMatches } from "@/hooks/queries"
import { tournamentChampion } from "@/lib/bracket"
import { competitionRanks } from "@/lib/rank"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bullet } from "@/components/Bullet"
import { SignHeading } from "@/components/SignHeading"
import { EmptyState } from "@/components/EmptyState"
import { ListSkeleton } from "@/components/ListSkeleton"
import { LeagueAwards } from "@/components/LeagueAwards"
import { ScoringGuide } from "@/components/ScoringGuide"
import { remainingMaxPoints } from "@/lib/scoring"
import { cn } from "@/lib/utils"

// Shared grid template (rank, player, exact, outcome, points), identical
// between header and rows so they align.
const COLS =
  "grid grid-cols-[2rem_minmax(0,1fr)_3rem_4.25rem_3.5rem] items-center gap-2 sm:grid-cols-[2.25rem_minmax(0,1fr)_4.5rem_5rem_4.5rem] sm:gap-3"

export function Leaderboard() {
  const { session } = useAuth()
  const { data, isLoading } = useLeaderboard()
  const { data: matches } = useMatches()
  const reduceMotion = useReducedMotion()
  const navigate = useNavigate()
  // Standard competition ranking: fully tied rows share a rank (e.g. two
  // players tied at 1st both show 1, the next player is 3rd).
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4 px-1 sm:px-0">
        <SignHeading
          as="h1"
          size="lg"
          title={over ? "Final standings" : "Leaderboard"}
          sub={data ? `${data.length} players` : undefined}
        />
        <ScoringGuide />
      </div>

      <div
        className={cn(
          "grid grid-cols-1 items-start gap-4",
          over && "lg:grid-cols-[minmax(0,1fr)_24rem]"
        )}
      >
        <Card className="gap-0 py-2">
          <CardContent className="px-2 sm:px-4">
            {matches && remainingPoints > 0 && (
              <p className="px-2 pt-2 pb-3 text-sm text-muted-foreground">
                Up to{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {remainingPoints} pts
                </span>{" "}
                still up for grabs in the remaining matches.
              </p>
            )}
            {isLoading ? (
              <ListSkeleton
                count={5}
                className="flex flex-col gap-2 py-2"
                itemClassName="h-12 w-full rounded-lg"
              />
            ) : data?.length === 0 ? (
              <EmptyState className="py-8">No players yet.</EmptyState>
            ) : (
              <div>
                {/* Header row (static, not part of the reorder layout group) */}
                <div
                  className={cn(
                    COLS,
                    "border-b px-2 py-2.5 text-xs font-medium text-muted-foreground"
                  )}
                >
                  <span>
                    <span className="sr-only">Rank</span>
                  </span>
                  <span>Player</span>
                  <span className="text-center">Exact</span>
                  <span className="text-center">Outcome</span>
                  <span className="text-right">Points</span>
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
                              y: {
                                duration: 0.18,
                                delay: Math.min(i, 8) * 0.03,
                              },
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
                        "min-h-14 cursor-pointer rounded-lg px-2 py-2 transition-colors duration-[var(--duration-fast)] hover:bg-accent active:bg-accent-pressed focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        isMe && "bg-win hover:bg-win active:bg-win"
                      )}
                    >
                      <Bullet
                        tone={rank === 1 ? "signal" : "muted"}
                        size="md"
                        label={`Rank ${rank}`}
                      >
                        {rank}
                      </Bullet>
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="min-w-0 truncate text-[15px] font-semibold tracking-tight">
                          @{row.username}
                        </span>
                        {isMe && (
                          <Badge variant="default" className="h-5 px-2 text-[11px]">
                            You
                          </Badge>
                        )}
                      </span>
                      <span className="text-center tabular-nums text-muted-foreground">
                        {row.exact_count}
                      </span>
                      <span className="text-center tabular-nums text-muted-foreground">
                        {row.outcome_count}
                      </span>
                      <span className="text-right text-lg font-bold tabular-nums tracking-tight">
                        {row.total_points}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <LeagueAwards matches={matches} className="lg:sticky lg:top-20" />
      </div>
    </div>
  )
}
