import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMatches } from "@/hooks/queries"
import { Card } from "@/components/ui/card"
import { ListSkeleton } from "@/components/ListSkeleton"
import { SegmentedControl } from "@/components/SegmentedControl"
import { TeamDisplay } from "@/components/TeamDisplay"
import { flagEmoji } from "@/lib/flags"
import { STAGE_SHORT } from "@/lib/scoring"
import { kickoffTime, shortDate } from "@/lib/format"
import type { MatchRow, MatchStage } from "@/lib/types"
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

/** Winner-round nav pills in bracket order, each paired with its column depth
 *  counting from the Round-of-32 leaves (depth 0). The Final is depth 4. */
const ROUND_NAV: { stage: MatchStage; depth: number }[] = [
  { stage: "R32", depth: 0 },
  { stage: "R16", depth: 1 },
  { stage: "QF", depth: 2 },
  { stage: "SF", depth: 3 },
  { stage: "FINAL", depth: 4 },
]

/** Card + connector widths in px, tuned so the full 5-round tree fits a phone
 *  viewport with no horizontal scroll. The focused round's cards render full
 *  (names + scores + date); every other round compresses to a flag + score chip
 *  so the whole tree stays visible. Each gap between rounds = STUB (horizontal
 *  line from the feeder card's right edge) + CONN (vertical bar + stub into the
 *  next card). Total width is constant: 4*MINI + FULL + 4*(STUB+CONN) = 380px. */
const FULL_W = 140
const MINI_W = 44

/** Cards stay a fixed size; the inter-round gaps are the only horizontal
 *  dimension that flexes, so the tree fills its container (wide horizontal lines
 *  on desktop, tight on a phone) without resizing the cards. Each gap splits
 *  into a `stub` (feeder side — card edge to the vertical bar) and a `conn`
 *  (destination side — vertical bar to the next card). Both scale with the
 *  width; `STUB_FRACTION` keeps the bar from hugging the feeder cards while
 *  still leaving most of the run on the destination side. Floored so the bars
 *  stay drawable on a phone; below that the container scrolls. */
const STUB_FRACTION = 0.4
const STUB_MIN = 6
const CONN_MIN = 6
const GAP_DEFAULT = 16
/** Combined width of the five card columns (one full + four compressed). The
 *  focused round only swaps which column is full, so this total is constant. */
const CARDS_W = FULL_W + 4 * MINI_W

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

/** Full knockout match card — shown for the focused round only. Fixed width so
 *  the round's cards line up into a clean column. Carries date + FT/kickoff and
 *  the two team rows with scores; the stage label lives in the round nav above. */
function MatchFull({ m }: { m: MatchRow }) {
  const w = winnerSide(m)
  const finished = m.status === "FINISHED" && m.home_score != null
  const showPens =
    m.duration === "PENALTY_SHOOTOUT" &&
    m.home_pens != null &&
    m.away_pens != null

  return (
    <Card
      className="shrink-0 gap-0 py-0 animate-in fade-in-0 fill-mode-backwards duration-[var(--duration-base)] ease-out-cubic"
      style={{ width: FULL_W }}
    >
      <div className="flex items-center justify-between border-b border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>{shortDate(m.kickoff)}</span>
        <span>{finished ? "FT" : kickoffTime(m.kickoff)}</span>
      </div>
      <div className="flex flex-col gap-0.5 px-2 py-1">
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

/** One row of a compressed card: flag + score, no name. */
function TinyRow({
  code,
  score,
  won,
  lost,
}: {
  code: string | null
  score: number | null
  won: boolean
  lost: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-0.5",
        won && "font-semibold",
        lost && "opacity-40"
      )}
    >
      <span className="text-sm leading-none">{flagEmoji(code)}</span>
      <span className="w-3 text-right text-[11px] tabular-nums">{score ?? ""}</span>
    </div>
  )
}

/** Compressed knockout match card — shown for the non-focused rounds. Flag +
 *  score per side, no names: enough to read the tree while keeping each round
 *  narrow enough that the whole bracket fits without horizontal scroll. */
function MatchMini({ m }: { m: MatchRow }) {
  const w = winnerSide(m)
  const finished = m.status === "FINISHED" && m.home_score != null

  return (
    <Card className="shrink-0 gap-0 px-1 py-1" style={{ width: MINI_W }}>
      <div className="flex flex-col gap-0.5">
        <TinyRow
          code={m.home_code}
          score={m.home_score}
          won={w === "home"}
          lost={finished && w === "away"}
        />
        <TinyRow
          code={m.away_code}
          score={m.away_score}
          won={w === "away"}
          lost={finished && w === "home"}
        />
      </div>
    </Card>
  )
}

/** One node of the bracket, laid out recursively: this match's two feeders
 *  (stacked vertically) on the left, then a connector, then this match's card —
 *  vertically centred between its feeders. `depth` is this match's round
 *  (0 = R32 leaves, 4 = Final); the card expands when `depth === activeDepth`
 *  and compresses to flag + score otherwise, so focusing a round via the nav
 *  expands that column while the tree shape and connectors stay intact. */
function Node({
  id,
  depth,
  activeDepth,
  stub,
  conn,
  byId,
}: {
  id: number
  depth: number
  activeDepth: number
  stub: number
  conn: number
  byId: Map<number, MatchRow>
}) {
  const m = byId.get(id)
  const feeders = FEEDERS[id]
  const full = depth === activeDepth

  if (!feeders) {
    return (
      <div
        className={cn(
          "flex items-center py-1 transition-opacity",
          !full && "opacity-50"
        )}
      >
        {m && (full ? <MatchFull m={m} /> : <MatchMini m={m} />)}
      </div>
    )
  }

  return (
    <div className="flex items-stretch">
      <div className="flex flex-col justify-center">
        <div className="flex items-center">
          <Node id={feeders[0]} depth={depth - 1} activeDepth={activeDepth} stub={stub} conn={conn} byId={byId} />
          <div className="shrink-0 border-t border-border" style={{ width: stub }} />
        </div>
        <div className="flex items-center">
          <Node id={feeders[1]} depth={depth - 1} activeDepth={activeDepth} stub={stub} conn={conn} byId={byId} />
          <div className="shrink-0 border-t border-border" style={{ width: stub }} />
        </div>
      </div>
      {/* Connector: vertical bar joining the two feeder stubs (their centres
          land at 25%/75% of this row), plus a horizontal stub into this match's
          card. The feeder stubs ensure lines exit cleanly from each card's
          right-centre rather than from a corner. Its width (`conn`) is computed
          to stretch the tree across the container. */}
      <div
        className="relative shrink-0 self-stretch before:absolute before:left-0 before:top-1/4 before:bottom-1/4 before:border-l before:border-border after:absolute after:inset-x-0 after:top-1/2 after:border-t after:border-border"
        style={{ width: conn }}
        aria-hidden
      />
      <div
        className={cn(
          "flex items-center transition-opacity",
          !full && "opacity-50"
        )}
      >
        {m && (full ? <MatchFull m={m} /> : <MatchMini m={m} />)}
      </div>
    </div>
  )
}

/** Knockout bracket: rounds run left (Round of 32) to right (Final) and the tree
 *  branches vertically within each gap. A round selector above focuses a round:
 *  that round's matches expand to full cards (with date + scores), while every
 *  other round compresses to flag + score chips so the whole tree fits the
 *  viewport with no horizontal scroll. Built from FEEDERS, so the full shape
 *  shows even before any knockout team is known — slots fill in ("TBD" →
 *  teams/scores) as the sync resolves results. The third-place play-off is fed
 *  by the SF losers, so it sits outside the winners' tree and is shown on its
 *  own below. */
export function Bracket() {
  const query = useMatches()
  const matches = query.data
  const isLoading = query.isLoading
  const [activeDepth, setActiveDepth] = useState(0)

  // Fit-to-width: measure the container and stretch the four inter-round gaps so
  // the fixed-size cards spread across the full width instead of huddling at
  // 380px. Cards never resize; only the gaps flex, split into a feeder-side stub
  // and a destination-side connector. A callback ref (not useRef + effect) wires
  // up the observer because the wrap mounts only after the async match data
  // loads — an effect with `[]` deps would have run while the loading skeleton
  // was up and the wrap was still null, then never re-run.
  const [{ stub, conn }, setGap] = useState({ stub: STUB_MIN, conn: GAP_DEFAULT })
  const roRef = useRef<ResizeObserver | null>(null)
  const setWrap = useCallback((node: HTMLDivElement | null) => {
    roRef.current?.disconnect()
    if (!node) return
    const measure = () => {
      // 4 gaps fill the slack beyond the cards; split each into stub + conn.
      const gap = (node.clientWidth - CARDS_W) / 4
      const stub = Math.max(STUB_MIN, gap * STUB_FRACTION)
      setGap({ stub, conn: Math.max(CONN_MIN, gap - stub) })
    }
    measure()
    roRef.current = new ResizeObserver(measure)
    roRef.current.observe(node)
  }, [])

  useEffect(() => () => roRef.current?.disconnect(), [])

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
    <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards duration-300 ease-out motion-reduce:animate-none">
      {/* Round selector — focuses one round (expands its column to full cards). */}
      <SegmentedControl
        layoutId="bracket-round-active"
        value={activeDepth}
        onChange={setActiveDepth}
        options={ROUND_NAV.map(({ stage, depth }) => ({
          value: depth,
          label: STAGE_SHORT[stage],
        }))}
      />

      <div ref={setWrap}>
        <Node id={FINAL_ID} depth={4} activeDepth={activeDepth} stub={stub} conn={conn} byId={byId} />
      </div>

      {third && (
        <section className="space-y-2">
          <h3 className="px-1 text-sm font-semibold text-muted-foreground">
            Third-place play-off
          </h3>
          <div className="w-max">
            <MatchFull m={third} />
          </div>
        </section>
      )}
    </div>
  )
}
