import { useMemo } from "react"
import { useMatches } from "@/hooks/queries"
import { Card } from "@/components/ui/card"
import { ListSkeleton } from "@/components/ListSkeleton"
import { TeamDisplay } from "@/components/TeamDisplay"
import { STAGE_SHORT } from "@/lib/scoring"
import { kickoffTime } from "@/lib/format"
import type { MatchRow } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Knockout bracket linkage for 2026, by official match number (matches.id).
 *  Each later match is fed by its two feeder matches' WINNERS. This is fixed by
 *  the schedule regardless of which teams qualify, and isn't stored in our
 *  fixture data (knockout rows carry only stage/kickoff), so it's encoded here.
 *  The third-place play-off (103) is fed by the SF losers and sits outside this
 *  winners' tree — it's rendered separately. Source: FIFA 2026 match schedule. */
const FEEDERS: Record<number, [number, number]> = {
  104: [101, 102], // Final
  101: [97, 98], // Semi-finals
  102: [99, 100],
  97: [89, 90], // Quarter-finals
  98: [93, 94],
  99: [91, 92],
  100: [95, 96],
  89: [74, 77], // Round of 16
  90: [73, 75],
  91: [76, 78],
  92: [79, 80],
  93: [83, 84],
  94: [81, 82],
  95: [86, 88],
  96: [85, 87],
}

const FINAL_ID = 104
const THIRD_ID = 103

/** Which side won, judged on 90'+ET first and the shootout only as a decider —
 *  the same rule scoring uses for outcomes (pens are display-only there, but
 *  here they legitimately decide who advances). Null while unfinished or level. */
function winnerSide(m: MatchRow): "home" | "away" | null {
  if (m.status !== "FINISHED" || m.home_score == null || m.away_score == null)
    return null
  if (m.home_score > m.away_score) return "home"
  if (m.away_score > m.home_score) return "away"
  if (m.home_pens != null && m.away_pens != null) {
    if (m.home_pens > m.away_pens) return "home"
    if (m.away_pens > m.home_pens) return "away"
  }
  return null
}

function TeamLine({
  name,
  code,
  score,
  pens,
  won,
  lost,
}: {
  name: string | null
  code: string | null
  score: number | null
  pens: number | null
  won: boolean
  lost: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-1.5",
        won && "font-semibold",
        lost && "text-muted-foreground"
      )}
    >
      <TeamDisplay name={name} code={code} size="sm" />
      <span className="flex shrink-0 items-center gap-1 tabular-nums">
        {pens != null && (
          <span className="text-[10px] text-muted-foreground">({pens})</span>
        )}
        <span className="w-3 text-right text-sm">{score ?? ""}</span>
      </span>
    </div>
  )
}

/** A fixed-width knockout match card — one per slot in the bracket. Fixed width
 *  so every round's cards line up into clean columns as the tree branches. */
function MatchMini({ m }: { m: MatchRow }) {
  const w = winnerSide(m)
  const finished = m.status === "FINISHED" && m.home_score != null
  const showPens =
    m.duration === "PENALTY_SHOOTOUT" &&
    m.home_pens != null &&
    m.away_pens != null

  return (
    <Card className="w-44 shrink-0 gap-0 py-0">
      <div className="flex items-center justify-between border-b border-border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>{STAGE_SHORT[m.stage]}</span>
        <span>{finished ? "FT" : kickoffTime(m.kickoff)}</span>
      </div>
      <div className="flex flex-col gap-1 px-2.5 py-1.5">
        <TeamLine
          name={m.home_team}
          code={m.home_code}
          score={m.home_score}
          pens={showPens ? m.home_pens : null}
          won={w === "home"}
          lost={finished && w === "away"}
        />
        <TeamLine
          name={m.away_team}
          code={m.away_code}
          score={m.away_score}
          pens={showPens ? m.away_pens : null}
          won={w === "away"}
          lost={finished && w === "home"}
        />
      </div>
    </Card>
  )
}

/** One node of the horizontal bracket, laid out recursively: this match's two
 *  feeders (stacked vertically) on the left, then a connector, then this match's
 *  card — vertically centred between its feeders. Because every node renders its
 *  own subtree, the columns and the branch connectors line up automatically at
 *  any depth, with no global position maths. Leaves are the Round of 32. */
function Node({ id, byId }: { id: number; byId: Map<number, MatchRow> }) {
  const m = byId.get(id)
  const feeders = FEEDERS[id]

  if (!feeders) {
    return (
      <div className="flex items-center py-1">
        {m && <MatchMini m={m} />}
      </div>
    )
  }

  return (
    <div className="flex items-stretch">
      <div className="flex flex-col justify-center">
        <Node id={feeders[0]} byId={byId} />
        <Node id={feeders[1]} byId={byId} />
      </div>
      {/* Connector: vertical bar joining the two feeders (their centres land at
          25%/75% of this row), plus a horizontal stub into this match's card. */}
      <div
        className="relative w-5 shrink-0 self-stretch before:absolute before:left-0 before:top-1/4 before:bottom-1/4 before:border-l before:border-border after:absolute after:inset-x-0 after:top-1/2 after:border-t after:border-border"
        aria-hidden
      />
      <div className="flex items-center">{m && <MatchMini m={m} />}</div>
    </div>
  )
}

/** Horizontal knockout bracket: rounds run left (Round of 32) to right (Final)
 *  and the tree branches vertically within each gap. Scrolls horizontally to
 *  span every round. Built from FEEDERS, so the full shape shows even before any
 *  knockout team is known — slots fill in ("TBD" → teams/scores) as the sync
 *  resolves results. The third-place play-off is fed by the SF losers, so it
 *  sits outside the winners' tree and is shown on its own below. */
export function Bracket() {
  const { data: matches, isLoading } = useMatches()

  const { byId, hasKnockout } = useMemo(() => {
    const byId = new Map<number, MatchRow>()
    let hasKnockout = false
    for (const m of matches ?? []) {
      if (m.stage === "GROUP") continue
      byId.set(m.id, m)
      hasKnockout = true
    }
    return { byId, hasKnockout }
  }, [matches])

  if (isLoading) {
    return <ListSkeleton count={6} itemClassName="h-20 w-full" />
  }

  if (!hasKnockout) return null

  const third = byId.get(THIRD_ID)

  return (
    <div className="space-y-4">
      <div className="-mx-3 overflow-x-auto px-3 pb-2 sm:-mx-4 sm:px-4">
        <div className="w-max">
          <Node id={FINAL_ID} byId={byId} />
        </div>
      </div>

      {third && (
        <section className="space-y-2">
          <h3 className="px-1 text-sm font-semibold text-muted-foreground">
            Third-place play-off
          </h3>
          <MatchMini m={third} />
        </section>
      )}
    </div>
  )
}
