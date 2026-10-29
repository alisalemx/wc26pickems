import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMatches } from "@/hooks/queries"
import { Card } from "@/components/ui/card"
import { ListSkeleton } from "@/components/ListSkeleton"
import { SegmentedControl } from "@/components/SegmentedControl"
import { TeamDisplay } from "@/components/TeamDisplay"
import { Whistle } from "@/components/Whistle"
import { Flag } from "@/components/Flag"
import { STAGE_LABEL, STAGE_SHORT } from "@/lib/scoring"
import { kickoffTime, shortDayHeading, isLive } from "@/lib/format"
import { FEEDERS, FINAL_ID, THIRD_ID, resolveMatch, winnerSide } from "@/lib/bracket"
import { entranceClasses, type Entrance } from "@/lib/entrance"
import type { MatchRow, MatchStage } from "@/lib/types"
import { cn } from "@/lib/utils"

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
 *  next card). The narrowest tree is 4*MINI + FULL + 4*(STUB_MIN+CONN_MIN) =
 *  348px, which fits a 375px phone; narrower screens scroll the tree itself. */
const FULL_W = 140
const MINI_W = 40
/** Wide mode (desktop): once all five rounds fit as full cards with roomy gaps,
 *  every round renders full and the round selector goes away. Cards then grow
 *  with the container up to WIDE_CARD_MAX. */
const WIDE_GAP_MIN = 40
const WIDE_CARD_MAX = 184
const WIDE_MIN = 5 * FULL_W + 4 * WIDE_GAP_MIN

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
        "flex items-center justify-between gap-1.5 [&_span.truncate]:text-[13px]",
        won && "[&_span.truncate]:font-semibold"
      )}
    >
      <TeamDisplay name={name} code={code} size="sm" dim={lost} />
      <span
        className={cn(
          "flex shrink-0 items-center gap-1 tabular-nums",
          lost && "text-quiet"
        )}
      >
        {pens != null && (
          <span className="text-[11px] text-muted-foreground">({pens})</span>
        )}
        <span className="w-4 text-right text-sm font-bold">{score ?? ""}</span>
      </span>
    </div>
  )
}

/** Full knockout match card — shown for the focused round (every round in wide
 *  mode). Fixed width so the round's cards line up into a clean column. Carries
 *  date + FT/kickoff and the two team rows with scores; the stage label lives in
 *  the round nav above. `fadeIn` is read once, at mount: a card that expands
 *  when you pick a round fades in, while cards on the first load arrive with
 *  the bracket (its one entrance), and a re-render never replays the fade. */
function MatchFull({
  m,
  width = FULL_W,
  fadeIn = false,
}: {
  m: MatchRow
  width?: number
  fadeIn?: boolean
}) {
  const [fade] = useState(fadeIn)
  const w = winnerSide(m)
  const finished = m.status === "FINISHED" && m.home_score != null
  const live = isLive(m.kickoff, m.status, m.stage)
  const showPens =
    m.duration === "PENALTY_SHOOTOUT" &&
    m.home_pens != null &&
    m.away_pens != null

  return (
    <Card
      className={cn(
        "shrink-0 gap-0 rounded-lg py-0",
        fade &&
          "animate-in fade-in-0 fill-mode-backwards animation-duration-[var(--duration-base)] ease-out-cubic",
        // The Final's slot is ringed in the one bold colour — the marquee node
        // of the tree.
        m.stage === "FINAL" && "shadow-[inset_0_0_0_2px_var(--signal)]"
      )}
      style={{ width }}
    >
      <div className="flex items-center justify-between border-b border-border px-2.5 pt-1.5 pb-1 text-[11px] font-medium text-muted-foreground">
        <span>{shortDayHeading(m.kickoff)}</span>
        {live ? (
          <LiveTag />
        ) : finished ? (
          <span className="flex items-center gap-1">
            <Whistle className="size-3" /> FT
          </span>
        ) : (
          <span>{kickoffTime(m.kickoff)}</span>
        )}
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

/** "Live" tag for the focused-round card header, replacing the kickoff/FT label
 *  while a match is in progress — a pulsing red dot + Live. (The bracket card
 *  is tight, so unlike the match list this tag is just a status marker, not a
 *  link.) The CSS `animate-ping` is neutralized by the global
 *  prefers-reduced-motion backstop. */
function LiveTag() {
  return (
    <span className="flex items-center gap-1 font-semibold text-destructive">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-destructive" />
      </span>
      Live
    </span>
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
        won && "font-bold",
        lost && "text-quiet [&_img]:opacity-40"
      )}
    >
      <Flag code={code} size="xs" />
      {/* leading-none matches the flag span so a present score digit doesn't
          make a finished-match mini taller than a scoreless one — unequal mini
          heights desync sibling subtrees and pull the fixed 25%/75% connector
          bar off the feeder cards. */}
      <span className="w-3 text-right text-[11px] leading-none tabular-nums">
        {score ?? ""}
      </span>
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
    <Card
      className={cn(
        "shrink-0 gap-0 rounded-lg px-1 py-1",
        // Keep the Final's ring when its column is compressed too, so the
        // marquee slot stays findable at a glance in every focus state.
        m.stage === "FINAL" && "shadow-[inset_0_0_0_2px_var(--signal)]"
      )}
      style={{ width: MINI_W }}
    >
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
  wide,
  cardW,
  fadeIn,
  byId,
}: {
  id: number
  depth: number
  activeDepth: number
  stub: number
  conn: number
  /** Wide mode: every round renders full, at `cardW`. */
  wide: boolean
  cardW: number
  /** Fade newly expanded cards in (true once the user has picked a round). */
  fadeIn: boolean
  byId: Map<number, MatchRow>
}) {
  const m = resolveMatch(byId, id)
  const feeders = FEEDERS[id]
  const full = wide || depth === activeDepth

  if (!feeders) {
    return (
      <div
        className={cn(
          "flex items-center py-1 transition-opacity",
          !full && "opacity-50"
        )}
      >
        {m && (full ? <MatchFull m={m} width={cardW} fadeIn={fadeIn} /> : <MatchMini m={m} />)}
      </div>
    )
  }

  return (
    <div className="flex items-stretch">
      <div className="flex flex-col justify-center">
        <div className="flex items-center">
          <Node id={feeders[0]} depth={depth - 1} activeDepth={activeDepth} stub={stub} conn={conn} wide={wide} cardW={cardW} fadeIn={fadeIn} byId={byId} />
          <div className="shrink-0 border-t border-input" style={{ width: stub }} />
        </div>
        <div className="flex items-center">
          <Node id={feeders[1]} depth={depth - 1} activeDepth={activeDepth} stub={stub} conn={conn} wide={wide} cardW={cardW} fadeIn={fadeIn} byId={byId} />
          <div className="shrink-0 border-t border-input" style={{ width: stub }} />
        </div>
      </div>
      {/* Connector: vertical bar joining the two feeder stubs (their centres
          land at 25%/75% of this row), plus a horizontal stub into this match's
          card. The feeder stubs ensure lines exit cleanly from each card's
          right-centre rather than from a corner. Its width (`conn`) is computed
          to stretch the tree across the container. */}
      <div
        className="relative shrink-0 self-stretch before:absolute before:left-0 before:top-1/4 before:bottom-1/4 before:border-l before:border-input after:absolute after:inset-x-0 after:top-1/2 after:border-t after:border-input"
        style={{ width: conn }}
        aria-hidden
      />
      <div
        className={cn(
          "flex items-center transition-opacity",
          !full && "opacity-50"
        )}
      >
        {m && (full ? <MatchFull m={m} width={cardW} fadeIn={fadeIn} /> : <MatchMini m={m} />)}
      </div>
    </div>
  )
}

/** Knockout bracket: rounds run left (Round of 32) to right (Final) and the tree
 *  branches vertically within each gap. A round selector above focuses a round:
 *  that round's matches expand to full cards (with date + scores), while every
 *  other round compresses to flag + score chips so the whole tree fits the
 *  viewport with no horizontal scroll. Built from FEEDERS, so the full shape
 *  shows even before any knockout team is known — empty slots fill in as soon as
 *  their feeder matches finish (winners propagated client-side via `resolveMatch`,
 *  ahead of football-data assigning the slot upstream). The third-place play-off
 *  is fed by the SF losers, so it sits outside the winners' tree and is shown on
 *  its own below. `entrance` (src/lib/entrance.ts) is how it arrives: the
 *  slide-up on the page's first load, or the lighter entrance after a tab
 *  switch. */
export function Bracket({ entrance = "cascade" }: { entrance?: Entrance }) {
  const query = useMatches()
  const matches = query.data
  const isLoading = query.isLoading
  // The focused round is derived, not stored: a user's explicit pick (`chosen`)
  // wins, but until they pick one we default to the round that's actually in
  // play — the first round not yet fully finished (R32 done → R16, then QF, SF,
  // Final as each completes), falling back to the Final once all are decided.
  // Same philosophy as the Groups/Bracket tab default in `Tournament.tsx`.
  const [chosen, setChosen] = useState<number | null>(null)

  // Fit-to-width: measure the container and stretch the four inter-round gaps so
  // the fixed-size cards spread across the full width instead of huddling at
  // 380px. Cards never resize; only the gaps flex, split into a feeder-side stub
  // and a destination-side connector. A callback ref (not useRef + effect) wires
  // up the observer because the wrap mounts only after the async match data
  // loads — an effect with `[]` deps would have run while the loading skeleton
  // was up and the wrap was still null, then never re-run.
  const [{ stub, conn, wide, cardW }, setGap] = useState({
    stub: STUB_MIN,
    conn: GAP_DEFAULT,
    wide: false,
    cardW: FULL_W,
  })
  const roRef = useRef<ResizeObserver | null>(null)
  const setWrap = useCallback((node: HTMLDivElement | null) => {
    roRef.current?.disconnect()
    if (!node) return
    const measure = () => {
      const width = node.clientWidth
      // Wide enough for five full columns: every round expands, and the cards
      // grow with the container (capped) while keeping roomy gaps.
      const wide = width >= WIDE_MIN
      const cardW = wide
        ? Math.min(WIDE_CARD_MAX, Math.floor((width - 4 * WIDE_GAP_MIN) / 5))
        : FULL_W
      // 4 gaps fill the slack beyond the cards; split each into stub + conn.
      const gap = (width - (wide ? 5 * cardW : CARDS_W)) / 4
      const stub = Math.max(STUB_MIN, gap * STUB_FRACTION)
      setGap({ stub, conn: Math.max(CONN_MIN, gap - stub), wide, cardW })
    }
    measure()
    roRef.current = new ResizeObserver(measure)
    roRef.current.observe(node)
  }, [])

  useEffect(() => () => roRef.current?.disconnect(), [])

  const { byId, hasKnockout, defaultDepth } = useMemo(() => {
    const byId = new Map<number, MatchRow>()
    let hasKnockout = false
    const total = new Map<MatchStage, number>()
    const finished = new Map<MatchStage, number>()
    for (const m of matches ?? []) {
      if (m.stage === "GROUP") continue
      byId.set(m.id, m)
      hasKnockout = true
      total.set(m.stage, (total.get(m.stage) ?? 0) + 1)
      if (m.status === "FINISHED")
        finished.set(m.stage, (finished.get(m.stage) ?? 0) + 1)
    }
    // Advance the default focus as rounds complete: the first round with an
    // unfinished (or not-yet-seeded) match, or the Final once every round is
    // done. Recomputed on each 60s refetch, so the focus moves the moment a
    // round's last match goes final (for anyone who hasn't picked a round).
    let defaultDepth = ROUND_NAV[ROUND_NAV.length - 1].depth
    for (const { stage, depth } of ROUND_NAV) {
      const t = total.get(stage) ?? 0
      if (t === 0 || (finished.get(stage) ?? 0) < t) {
        defaultDepth = depth
        break
      }
    }
    return { byId, hasKnockout, defaultDepth }
  }, [matches])

  const activeDepth = chosen ?? defaultDepth

  if (isLoading) {
    return <ListSkeleton count={6} itemClassName="h-20 w-full" />
  }

  if (!hasKnockout) return null

  const third = resolveMatch(byId, THIRD_ID)

  return (
    // The bracket's one entrance; its cards fade only when a picked round
    // expands them (MatchFull's `fadeIn`).
    <div
      className={cn(
        "flex flex-col gap-4",
        entranceClasses(
          entrance,
          "animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards animation-duration-[var(--duration-base)] ease-out-cubic"
        )
      )}
    >
      {wide ? (
        // Wide mode labels each column instead of offering a selector.
        <div
          className="grid text-sm font-semibold text-muted-foreground"
          style={{
            gridTemplateColumns: `repeat(5, ${cardW}px)`,
            columnGap: stub + conn,
          }}
        >
          {ROUND_NAV.map(({ stage }) => (
            <span key={stage}>{STAGE_LABEL[stage]}</span>
          ))}
        </div>
      ) : (
        // Round selector — focuses one round (expands its column to full cards).
        <SegmentedControl
          layoutId="bracket-round-active"
          value={activeDepth}
          onChange={setChosen}
          options={ROUND_NAV.map(({ stage, depth }) => ({
            value: depth,
            label: STAGE_SHORT[stage],
          }))}
        />
      )}

      <div ref={setWrap} className="overflow-x-auto">
        <Node id={FINAL_ID} depth={4} activeDepth={activeDepth} stub={stub} conn={conn} wide={wide} cardW={cardW} fadeIn={chosen != null} byId={byId} />
      </div>

      {third && (
        <section className="flex flex-col gap-2">
          <h3 className="px-1 text-sm font-semibold text-muted-foreground">
            Third-place play-off
          </h3>
          <div className="w-max">
            <MatchFull m={third} width={cardW} />
          </div>
        </section>
      )}
    </div>
  )
}
