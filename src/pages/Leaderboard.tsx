import { motion, useReducedMotion } from "motion/react"
import { useAuth } from "@/hooks/useAuth"
import { useLeaderboard } from "@/hooks/queries"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/EmptyState"
import { ListSkeleton } from "@/components/ListSkeleton"
import { cn } from "@/lib/utils"

const MEDALS = ["🥇", "🥈", "🥉"]

// Shared grid template — mirrors the old table-fixed columns (rank, player,
// exact, outcome, points). Kept identical between header and rows so they align.
const COLS = "grid grid-cols-[1.75rem_1fr_2.75rem_2.75rem_2.75rem] items-center gap-1"

export function Leaderboard() {
  const { session } = useAuth()
  const { data, isLoading } = useLeaderboard()
  const reduceMotion = useReducedMotion()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🏆</span> Leaderboard
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <Badge variant="gold">+3</Badge> exact score
          <span className="text-muted-foreground/40">·</span>
          <Badge variant="default">+1</Badge> correct outcome
          <span className="text-muted-foreground/40">·</span>
          <span className="font-semibold text-foreground">up to ×4</span> in the
          knockouts
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-5">
        {isLoading ? (
          <ListSkeleton count={5} className="space-y-2" itemClassName="h-10 w-full" />
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
              <span className="text-center tracking-normal">Exct</span>
              <span className="text-center tracking-normal">Outc</span>
              <span className="text-center tracking-normal">Pts</span>
            </div>

            {data?.map((row, i) => {
              const isMe = row.user_id === session?.user.id
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
                          layout: { type: "spring", duration: 0.5, bounce: 0.15 },
                          opacity: { duration: 0.18, delay: Math.min(i, 8) * 0.03 },
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
                    {MEDALS[i] ?? i + 1}
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
      </CardContent>
    </Card>
  )
}
