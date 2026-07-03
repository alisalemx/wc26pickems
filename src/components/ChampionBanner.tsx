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

// Podium bar height and tint per rank: gold, silver, bronze (soft washes of
// the rank-metal palette; the winner's bar is tallest). Height sits on the
// static wrapper; the tint is on the inner .podium-bar fill that scales up
// from the floor (see index.css).
const BAR_HEIGHT = ["h-20", "h-14", "h-10"]
// Angled like the rank-metal fills (deep at the edges, a lighter band
// through the middle) so each bar reads as a soft slab of its medal's metal.
const BAR_TINT = [
  "bg-linear-135 from-gold/55 via-gold/20 to-gold/45",
  "bg-linear-135 from-[#a8a8a8]/50 via-[#a8a8a8]/12 to-[#a8a8a8]/40",
  "bg-linear-135 from-[#d8812d]/40 via-[#d8812d]/10 to-[#d8812d]/30",
]

/** The tw-animate idiom for each cascading element: fade/slide in, delayed
 *  by the inline `--i` index via the shared .stagger-in utility (backwards
 *  fill holds the hidden start frame during the delay). */
const LINE_IN =
  "animate-in fade-in-0 slide-in-from-bottom-1 duration-[var(--duration-base)] ease-out-cubic stagger-in"

/** The podium sequence: the bars draw up from the floor first (.podium-bar
 *  in index.css, staggered off the column's --i), then each column's content
 *  — handle and points above the bar and the medal on it — reveals as
 *  ONE linked animation once its bar has finished filling. The two reveal
 *  elements share this class and the same inline animationDelay so they move
 *  as a unit. */
const CONTENT_IN =
  "animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards duration-[var(--duration-base)] ease-out-cubic"

/** When a column's content may enter: its bar's stagger delay plus the bar's
 *  fill time. MUST mirror .podium-bar in index.css (delay
 *  `min(--i, 6) * 45ms + 120ms`, duration `--duration-base * 1.75` = 420ms). */
function contentDelay(enter: number): CSSProperties {
  return { animationDelay: `${Math.min(enter, 6) * 45 + 120 + 420}ms` }
}

/** Champion banner for the match list: renders once the final (match 104)
 *  has a decided result, and stays invisible before then. A compact deep-gold
 *  band (`.finale-hero`, the card-scale sibling of `.stage-final`, with its
 *  one-shot sheen) crowns the world champions; below it, on the normal card
 *  surface, a podium celebrates the league's top 3 players with the winner
 *  raised in the middle in gold. The leaderboard view isn't readable
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
          className={`text-6xl ${LINE_IN}`}
          style={{ "--i": 0 } as CSSProperties}
          aria-hidden="true"
        >
          {flagEmoji(champion.code)}
        </span>
        <p
          className={`text-lg font-semibold ${LINE_IN}`}
          style={{ "--i": 1 } as CSSProperties}
        >
          {champion.team} are world champions
        </p>
      </div>

      {podium.length > 0 && (
        <div className="p-4">
          <div className="flex items-end justify-center gap-1 sm:gap-4">
            {podium.map(({ row, rank, enter }) => {
              return (
                <div
                  key={row.user_id}
                  className="flex min-w-0 flex-1 flex-col items-center sm:max-w-36"
                  style={{ "--i": enter } as CSSProperties}
                >
                  <div
                    className={cn(
                      "flex w-full min-w-0 flex-col items-center",
                      CONTENT_IN
                    )}
                    style={contentDelay(enter)}
                  >
                    <span
                      title={`@${row.username}`}
                      className={cn(
                        "rank-sheen max-w-full truncate text-sm font-bold bg-clip-text text-transparent [-webkit-background-clip:text]",
                        TIER_GRADIENT[rank - 1]
                      )}
                    >
                      @{row.username}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {row.total_points} pts
                    </span>
                  </div>
                  <div
                    className={cn("relative mt-2 w-full", BAR_HEIGHT[rank - 1])}
                  >
                    <div
                      className={cn(
                        "podium-bar absolute inset-0 rounded-t-sm border border-b-0 border-ink",
                        BAR_TINT[rank - 1]
                      )}
                    />
                    <span
                      className={cn(
                        "absolute inset-x-0 top-1 text-center text-xl",
                        CONTENT_IN
                      )}
                      style={contentDelay(enter)}
                      aria-hidden="true"
                    >
                      {MEDALS[rank - 1]}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}
