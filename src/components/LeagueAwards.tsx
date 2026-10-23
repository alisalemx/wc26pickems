import { useMemo, type CSSProperties, type ReactNode } from "react"
import { Gem, Goal, Infinity as InfinityIcon } from "lucide-react"
import { useAllScoredPredictions, useLeaderboard } from "@/hooks/queries"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { SignHeading } from "@/components/SignHeading"
import { EmptyState } from "@/components/EmptyState"
import { tournamentChampion } from "@/lib/bracket"
import {
  pickBestSingleCall,
  pickEverPresent,
  pickSharpshooters,
  type NamedExactCall,
} from "@/lib/awards"
import { STAGE_LABEL } from "@/lib/scoring"
import { cn } from "@/lib/utils"
import type { MatchRow } from "@/lib/types"

/** "@a" / "@a and @b" / "@a, @b and @c". */
function handles(usernames: string[]): string {
  const tagged = usernames.map((u) => `@${u}`)
  if (tagged.length <= 1) return tagged.join("")
  return `${tagged.slice(0, -1).join(", ")} and ${tagged[tagged.length - 1]}`
}

/** One award row: a small icon, the award's name, who won it and the stat
 *  behind it (numbers are joined to their unit with a no-break space, so a
 *  wrap never strands "104" at the end of a line). Cascades in via .stagger-in (`--i` set by the caller). */
function AwardRow({
  i,
  icon: Icon,
  name,
  recipients,
  detail,
}: {
  i: number
  icon: typeof Gem
  name: string
  recipients: string
  detail: ReactNode
}) {
  return (
    <div
      className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards duration-[var(--duration-base)] ease-out-cubic stagger-in flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0"
      style={{ "--i": i } as CSSProperties}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-muted-foreground">
          {name}
        </div>
        <div className="text-[15px] font-semibold tracking-tight text-pretty">
          {recipients}{" "}
          <span className="font-normal text-muted-foreground">{detail}</span>
        </div>
      </div>
    </div>
  )
}

/** The league's end-of-tournament awards, shown on both the match list and
 *  the final standings. Gated on the same tournamentChampion predicate as
 *  every finale surface. The standings and revealed picks are public, so it
 *  renders for visitors too. */
export function LeagueAwards({
  matches,
  className,
}: {
  matches: MatchRow[] | undefined
  className?: string
}) {
  const champion = useMemo(
    () => tournamentChampion(matches ?? []),
    [matches]
  )
  const enabled = champion != null
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
    <Card
      className={cn(
        "gap-4 animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards duration-[var(--duration-base)] ease-out-cubic",
        className
      )}
    >
      <CardHeader>
        <SignHeading title="Hall of fame" />
      </CardHeader>
      <CardContent className="divide-y">
        {empty ? (
          <EmptyState className="py-6">Awards aren't in yet.</EmptyState>
        ) : (
          <>
            {sharpshooters.length > 0 && (
              <AwardRow
                i={0}
                icon={Goal}
                name="Sharpshooter"
                recipients={handles(sharpshooters.map((s) => s.username))}
                detail={`·\u00a0${sharpshooters[0].exact_count}\u00a0exact ${
                  sharpshooters[0].exact_count === 1 ? "score" : "scores"
                }`}
              />
            )}
            {bestCall && (
              <AwardRow
                i={1}
                icon={Gem}
                name="Best single call"
                recipients={`@${bestCall.username}`}
                detail={`·\u00a0${bestCall.home_pred}–${bestCall.away_pred} in the ${STAGE_LABEL[bestCall.stage]}, +${bestCall.points}\u00a0pts`}
              />
            )}
            {everPresent.length > 0 && (
              <AwardRow
                i={2}
                icon={InfinityIcon}
                name="Ever-present"
                recipients={handles(everPresent.map((s) => s.username))}
                detail={`·\u00a0${everPresent[0].scored_count}\u00a0scored ${
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
