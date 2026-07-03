import { useMemo } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useLeaderboard } from "@/hooks/queries"
import { Card, CardContent } from "@/components/ui/card"
import { tournamentChampion } from "@/lib/bracket"
import { pickLeagueWinners } from "@/lib/awards"
import { flagEmoji } from "@/lib/flags"
import type { MatchRow } from "@/lib/types"

/** "@a" / "@a and @b" / "@a, @b and @c". */
function handles(usernames: string[]): string {
  const tagged = usernames.map((u) => `@${u}`)
  if (tagged.length <= 1) return tagged.join("")
  return `${tagged.slice(0, -1).join(", ")} and ${tagged[tagged.length - 1]}`
}

/** Champion banner for the match list: renders once the final (match 104)
 *  has a decided result, and stays invisible before then. Uses the flat
 *  pale-gold `gold` badge vocabulary (not `.stage-final`, which is reserved
 *  for the Final stage tag) so the two gold treatments stay visually
 *  distinct. For a signed-in viewer it also crowns the league winner(s);
 *  the leaderboard view isn't readable anonymously (and this page is
 *  public), so that fetch is session-gated and the banner degrades to the
 *  team-only celebration when the data isn't available. */
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
  const winners = useMemo(
    () => pickLeagueWinners(leaderboard ?? []),
    [leaderboard]
  )
  if (!champion) return null

  return (
    <Card className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards duration-[var(--duration-base)] ease-out-cubic border-ink bg-gold/20">
      <CardContent className="flex flex-col items-center gap-1.5 text-center">
        <span className="text-4xl" aria-hidden="true">
          {flagEmoji(champion.code)}
        </span>
        <p className="text-lg font-semibold text-foreground">
          {champion.team} are world champions.
        </p>
        <p className="text-sm text-muted-foreground">
          Final standings are in. Thanks for playing.
        </p>
        {winners.length > 0 && (
          <div className="mt-2 w-full border-t pt-3">
            <p className="text-sm font-medium text-foreground">
              🏆{" "}
              {winners.length === 1
                ? `${handles([winners[0].username])} wins the league.`
                : `${handles(winners.map((w) => w.username))} share the title.`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {winners[0].total_points} pts{winners.length > 1 && " each"} ·{" "}
              {winners[0].exact_count} exact{" "}
              {winners[0].exact_count === 1 ? "score" : "scores"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
