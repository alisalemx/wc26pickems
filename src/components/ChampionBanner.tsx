import { useMemo, type CSSProperties } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useLeaderboard } from "@/hooks/queries"
import { Card } from "@/components/ui/card"
import { tournamentChampion } from "@/lib/bracket"
import { competitionRanks } from "@/lib/rank"
import { flagEmoji } from "@/lib/flags"
import { cn } from "@/lib/utils"
import type { MatchRow } from "@/lib/types"

const MEDALS = ["🥇", "🥈", "🥉"]

// Metal fill matched to each medal, same idiom as the /me rank reveal
// (`.rank-metal-*` in index.css, clipped to the handle text). Indexed by
// rank - 1; top 3 rows always carry rank <= 3.
const TIER_GRADIENT = [
  "rank-metal rank-metal-gold",
  "rank-metal rank-metal-silver",
  "rank-metal rank-metal-bronze",
]

// Podium bar height + tint per rank. The winner's bar is tallest and gold.
const BAR = [
  "h-20 bg-gold/40",
  "h-14 bg-muted",
  "h-10 bg-muted",
]

/** The tw-animate idiom for each cascading element: fade/slide in, delayed
 *  by the inline `--i` index via the shared .stagger-in utility (backwards
 *  fill holds the hidden start frame during the delay). */
const LINE_IN =
  "animate-in fade-in-0 slide-in-from-bottom-1 duration-[var(--duration-base)] ease-out-cubic stagger-in"

/** Champion banner for the match list: renders once the final (match 104)
 *  has a decided result, and stays invisible before then. A compact deep-gold
 *  band (`.finale-hero`, the card-scale sibling of `.stage-final`, with its
 *  one-shot sheen) crowns the world champions; below it, on the normal card
 *  surface, a podium celebrates the league's top 3 players with the winner
 *  raised, crowned, and in gold. The leaderboard view isn't readable
 *  anonymously (and this page is public), so that fetch is session-gated and
 *  the banner degrades to the team-only band when the data isn't available. */
export function ChampionBanner({
  matches,
}: {
  matches: MatchRow[] | undefined
}) {
  const { session } = useAuth()
  const champion = useMemo(
    () => tournamentChampion(matches ?? []),
    [matches]
  )
  const { data: leaderboard } = useLeaderboard(
    Boolean(session) && champion != null
  )
  // Top 3 rows with their competition ranks (a full tie shares a rank, so
  // e.g. two shared golds then a bronze), arranged podium-style: 2nd on the
  // left, 1st raised in the middle, 3rd on the right. Cascade order builds
  // to the winner: bronze in first, gold last.
  const podium = useMemo(() => {
    const rows = leaderboard ?? []
    const ranks = competitionRanks(rows)
    const top = rows
      .slice(0, 3)
      .map((row, i) => ({ row, rank: ranks[i], enter: 4 - i }))
    const order = [1, 0, 2]
    return order.map((i) => top[i]).filter((s) => s != null)
  }, [leaderboard])

  if (!champion) return null

  return (
    <Card className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards duration-[var(--duration-base)] ease-out-quint gap-0 overflow-hidden border-ink py-0">
      <div className="finale-hero flex flex-col items-center gap-1 px-5 py-4 text-center">
        <span
          className={`text-4xl ${LINE_IN}`}
          style={{ "--i": 0 } as CSSProperties}
          aria-hidden="true"
        >
          {flagEmoji(champion.code)}
        </span>
        <p
          className={`text-lg font-semibold ${LINE_IN}`}
          style={{ "--i": 1 } as CSSProperties}
        >
          {champion.team} are world champions.
        </p>
      </div>

      {podium.length > 0 ? (
        <div className="px-4 pt-5 pb-4 sm:px-6">
          <div className="flex items-end justify-center gap-2 sm:gap-4">
            {podium.map(({ row, rank, enter }) => {
              const isTop = rank === 1
              return (
                <div
                  key={row.user_id}
                  className={cn(
                    "flex w-24 flex-col items-center sm:w-32",
                    LINE_IN
                  )}
                  style={{ "--i": enter } as CSSProperties}
                >
                  {isTop && (
                    <span className="mb-0.5 text-2xl" aria-hidden="true">
                      👑
                    </span>
                  )}
                  <span
                    title={`@${row.username}`}
                    className={cn(
                      "max-w-full truncate bg-clip-text font-bold text-transparent [-webkit-background-clip:text]",
                      isTop ? "text-base" : "text-sm",
                      TIER_GRADIENT[rank - 1]
                    )}
                  >
                    @{row.username}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {row.total_points} pts
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {row.exact_count} exact
                  </span>
                  <div
                    className={cn(
                      "mt-2 flex w-full items-start justify-center rounded-t-sm border border-b-0 border-ink pt-1 text-xl",
                      BAR[rank - 1]
                    )}
                  >
                    <span aria-hidden="true">{MEDALS[rank - 1]}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <p
            className={`mt-3 text-center text-xs text-muted-foreground ${LINE_IN}`}
            style={{ "--i": 5 } as CSSProperties}
          >
            Final standings are in. Thanks for playing.
          </p>
        </div>
      ) : (
        <p className="px-5 py-3 text-center text-xs text-muted-foreground">
          Final standings are in. Thanks for playing.
        </p>
      )}
    </Card>
  )
}
