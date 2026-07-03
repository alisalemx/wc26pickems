import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { tournamentChampion } from "@/lib/bracket"
import { flagEmoji } from "@/lib/flags"
import type { MatchRow } from "@/lib/types"

/** Champion banner for the match list: renders once the final (match 104)
 *  has a decided result, and stays invisible before then. Uses the flat
 *  pale-gold `gold` badge vocabulary (not `.stage-final`, which is reserved
 *  for the Final stage tag) so the two gold treatments stay visually
 *  distinct. */
export function ChampionBanner({
  matches,
}: {
  matches: MatchRow[] | undefined
}) {
  const champion = useMemo(
    () => tournamentChampion(matches ?? []),
    [matches]
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
      </CardContent>
    </Card>
  )
}
