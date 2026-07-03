import { useMemo, type CSSProperties, type ReactNode } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useAllScoredPredictions, useLeaderboard } from "@/hooks/queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/EmptyState"
import { tournamentChampion } from "@/lib/bracket"
import {
  pickBestSingleCall,
  pickEverPresent,
  pickSharpshooters,
  type NamedExactCall,
} from "@/lib/awards"
import { STAGE_LABEL } from "@/lib/scoring"
import type { MatchRow } from "@/lib/types"

/** "@a" / "@a and @b" / "@a, @b and @c". */
function handles(usernames: string[]): string {
  const tagged = usernames.map((u) => `@${u}`)
  if (tagged.length <= 1) return tagged.join("")
  return `${tagged.slice(0, -1).join(", ")} and ${tagged[tagged.length - 1]}`
}

/** One award row: an emoji medallion tile, the award's name, who won it and
 *  the stat behind it. Cascades in via .stagger-in (`--i` set by the caller). */
function AwardRow({
  i,
  emoji,
  name,
  recipients,
  detail,
}: {
  i: number
  emoji: string
  name: string
  recipients: string
  detail: ReactNode
}) {
  return (
    <div
      className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards duration-[var(--duration-base)] ease-out-cubic stagger-in flex items-center gap-3"
      style={{ "--i": i } as CSSProperties}
    >
      <span
        className="grid size-11 shrink-0 place-items-center rounded-md border border-ink bg-gold/20 text-xl shadow-brutal-sm"
        aria-hidden="true"
      >
        {emoji}
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
          {name}
        </div>
        <div className="truncate text-sm font-semibold">{recipients}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </div>
    </div>
  )
}

/** The league's end-of-tournament awards, shown on both the match list and
 *  the final standings. Gated on the same tournamentChampion predicate as
 *  every finale surface, and the data fetches are further session-gated
 *  because leaderboard/scored_predictions aren't readable anonymously — for
 *  a logged-out visitor the card simply doesn't render. */
export function LeagueAwards({
  matches,
}: {
  matches: MatchRow[] | undefined
}) {
  const { session } = useAuth()
  const champion = useMemo(
    () => tournamentChampion(matches ?? []),
    [matches]
  )
  const enabled = Boolean(session) && champion != null
  const { data: leaderboard } = useLeaderboard(enabled)
  const { data: allScored } = useAllScoredPredictions(enabled)

  const sharpshooters = useMemo(
    () => pickSharpshooters(leaderboard ?? []),
    [leaderboard]
  )
  const everPresent = useMemo(
    () => pickEverPresent(leaderboard ?? []),
    [leaderboard]
  )
  const bestCall = useMemo(() => {
    if (!allScored || !leaderboard) return null
    const usernameById = new Map(leaderboard.map((r) => [r.user_id, r.username]))
    const named: NamedExactCall[] = allScored.map((r) => ({
      ...r,
      username: usernameById.get(r.user_id) ?? "player",
    }))
    return pickBestSingleCall(named)
  }, [allScored, leaderboard])

  if (!enabled) return null
  const empty =
    sharpshooters.length === 0 && !bestCall && everPresent.length === 0

  return (
    <Card className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards duration-[var(--duration-base)] ease-out-cubic">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span aria-hidden="true">🏅</span> League awards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {empty ? (
          <EmptyState className="py-6">Awards aren't in yet.</EmptyState>
        ) : (
          <>
            {sharpshooters.length > 0 && (
              <AwardRow
                i={0}
                emoji="🎯"
                name="Sharpshooter"
                recipients={handles(sharpshooters.map((s) => s.username))}
                detail={`${sharpshooters[0].exact_count} exact ${
                  sharpshooters[0].exact_count === 1 ? "score" : "scores"
                }`}
              />
            )}
            {bestCall && (
              <AwardRow
                i={1}
                emoji="🔮"
                name="Best single call"
                recipients={`@${bestCall.username}`}
                detail={`called ${bestCall.home_pred}-${bestCall.away_pred} in the ${STAGE_LABEL[bestCall.stage]}, +${bestCall.points} pts`}
              />
            )}
            {everPresent.length > 0 && (
              <AwardRow
                i={2}
                emoji="🗓️"
                name="Ever-present"
                recipients={handles(everPresent.map((s) => s.username))}
                detail={`${everPresent[0].scored_count} scored ${
                  everPresent[0].scored_count === 1
                    ? "prediction"
                    : "predictions"
                }`}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
