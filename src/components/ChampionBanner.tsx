import { useMemo, type CSSProperties } from "react"
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

/** The tw-animate idiom for each cascading line: fade/slide in, delayed by
 *  the inline `--i` index via the shared .stagger-in utility (backwards fill
 *  holds the hidden start frame during the delay). */
const LINE_IN =
  "animate-in fade-in-0 slide-in-from-bottom-1 duration-[var(--duration-base)] ease-out-cubic stagger-in"

/** Champion banner for the match list: renders once the final (match 104)
 *  has a decided result, and stays invisible before then. Styled as the
 *  tournament's closing hero in the Final's deep-gold embossed treatment
 *  (`.finale-hero` in index.css — the card-scale sibling of `.stage-final`,
 *  with a one-shot sheen), so text flips to the light-on-gold scheme rather
 *  than the theme tokens. For a signed-in viewer it also crowns the league
 *  winner(s); the leaderboard view isn't readable anonymously (and this page
 *  is public), so that fetch is session-gated and the banner degrades to the
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
    <Card className="finale-hero animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards duration-[var(--duration-base)] ease-out-quint border-ink">
      <CardContent className="flex flex-col items-center gap-1.5 text-center">
        <span
          className={`text-5xl ${LINE_IN}`}
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
        <p
          className={`text-sm text-white/75 ${LINE_IN}`}
          style={{ "--i": 2 } as CSSProperties}
        >
          Final standings are in. Thanks for playing.
        </p>
        {winners.length > 0 && (
          <div className="mt-2 w-full border-t border-white/20 pt-3">
            <p
              className={`text-sm font-medium ${LINE_IN}`}
              style={{ "--i": 3 } as CSSProperties}
            >
              🏆{" "}
              {winners.length === 1
                ? `${handles([winners[0].username])} wins the league.`
                : `${handles(winners.map((w) => w.username))} share the title.`}
            </p>
            <p
              className={`mt-1 text-xs text-white/75 ${LINE_IN}`}
              style={{ "--i": 4 } as CSSProperties}
            >
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
