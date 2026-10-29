import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import { Link } from "react-router-dom"
import { ArrowUpRight } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useLeaderboard } from "@/hooks/queries"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Flag } from "@/components/Flag"
import { SignHeading } from "@/components/SignHeading"
import { tournamentChampion } from "@/lib/bracket"
import { competitionRanks } from "@/lib/rank"
import { ordinal } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { MatchRow } from "@/lib/types"

/** Fits one line of display text to its box's width: measures the word at its
 *  current size and scales it so it spans the box's content width exactly,
 *  capped at `max` px. Width scales linearly with font size here (the tracking
 *  is in em, and Inter's optical size tops out well below display sizes), so a
 *  single pass lands it. Re-fits when the box resizes and once the web font
 *  has loaded; until the first measure, the caller's CSS estimate holds. */
function useFitText(text: string | undefined, max: number) {
  const boxRef = useRef<HTMLDivElement>(null)
  const wordRef = useRef<HTMLSpanElement>(null)
  const [size, setSize] = useState<number | null>(null)
  useLayoutEffect(() => {
    const box = boxRef.current
    const word = wordRef.current
    if (!box || !word) return
    const fit = () => {
      const cs = getComputedStyle(box)
      const avail =
        box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      const current = parseFloat(getComputedStyle(word).fontSize)
      const width = word.getBoundingClientRect().width
      if (width > 0) setSize(Math.min(max, (current * avail) / width))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    void document.fonts?.ready.then(fit)
    return () => ro.disconnect()
  }, [text, max])
  return { boxRef, wordRef, size }
}

/** The champion hero for the match list: renders once the final (match 104)
 *  has a decided result, and stays invisible before then. A flat turf-green
 *  panel with the two-tone "World champions" heading and the winner's
 *  flag, over the team's name set as one huge word that bleeds off the bottom
 *  edge. The word is measured and fitted to the panel width (useFitText), so
 *  any name runs edge to edge whatever its letters. The panel is the one
 *  entrance; its contents arrive with it. */
export function ChampionBanner({
  matches,
}: {
  matches: MatchRow[] | undefined
}) {
  const champion = useMemo(
    () => tournamentChampion(matches ?? []),
    [matches]
  )
  // Capped so a very short name can't outgrow the panel's height.
  const { boxRef, wordRef, size } = useFitText(champion?.team, 448)
  if (!champion) return null

  // First-paint estimate (~0.5em per glyph) until the word is measured.
  const estimate = `${(100 / (Math.max(champion.team.length, 4) * 0.5)).toFixed(2)}cqw`

  return (
    <section
      aria-label={`${champion.team} are world champions`}
      className="@container relative isolate overflow-hidden rounded-2xl bg-signal text-signal-foreground animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards animation-duration-[var(--duration-base)] ease-out-quint"
    >
      <div className="flex items-start justify-between gap-4 p-5 sm:p-7">
        <SignHeading
          as="h1"
          size="lg"
          title="World"
          sub="champions"
          subClassName="text-signal-foreground/65"
        />
        <Flag code={champion.code} size="xl" className="sm:size-20" />
      </div>
      <div
        ref={boxRef}
        aria-hidden
        className="-mt-2 -mb-[0.09em] px-3 leading-[0.74] font-bold tracking-display whitespace-nowrap select-none sm:px-5"
        style={{ fontSize: size ? `${size}px` : estimate }}
      >
        <span ref={wordRef} className="inline-block">
          {champion.team}
        </span>
      </div>
    </section>
  )
}

// Podium bar height and tone per rank (the winner's bar is tallest). Only the
// winner wears the bold colour; 2nd and 3rd sit on the sunk tone, so the
// rank numbers carry the order. Height sits on the static wrapper; the tone is
// on the inner .podium-bar fill that scales up from the floor (see index.css).
const BAR_HEIGHT = ["h-28", "h-20", "h-14"]
const BAR_TONE = ["bg-signal", "bg-sunk", "bg-sunk"]

/** The tw-animate idiom for a podium column's content, which reveals once its
 *  bar has finished filling. */
const CONTENT_IN =
  "animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards animation-duration-[var(--duration-base)] ease-out-cubic"

/** When a column's content may enter: its bar's stagger delay plus the bar's
 *  fill time. MUST mirror .podium-bar in index.css (delay
 *  `min(--i, 6) * 45ms + 120ms`, duration `--duration-base * 1.75` = 420ms). */
function contentDelay(enter: number): CSSProperties {
  return { animationDelay: `${Math.min(enter, 6) * 45 + 120 + 420}ms` }
}

/** The league's top three once the tournament is over, podium-style: 2nd on
 *  the left, 1st raised in the middle, 3rd on the right, each bar a flat slab
 *  with the rank set large. The cascade builds to the winner:
 *  bronze in first, gold last. Off-podium viewers get their own finish below. */
export function LeaguePodium({
  matches,
  className,
}: {
  matches: MatchRow[] | undefined
  className?: string
}) {
  const { session } = useAuth()
  const champion = useMemo(
    () => tournamentChampion(matches ?? []),
    [matches]
  )
  const { data: leaderboard } = useLeaderboard(champion != null)
  // Top 3 rows with their competition ranks (a full tie shares a rank, so
  // e.g. two shared firsts then a third).
  const podium = useMemo(() => {
    const rows = leaderboard ?? []
    const ranks = competitionRanks(rows)
    const top = rows
      .slice(0, 3)
      .map((row, i) => ({ row, rank: ranks[i], enter: 4 - i }))
    const order = [1, 0, 2]
    return order.map((i) => top[i]).filter((s) => s != null)
  }, [leaderboard])

  // The viewer's own finish, for the line under the bars when they didn't
  // make the podium (podium members already see themselves up there).
  const viewer = useMemo(() => {
    const uid = session?.user.id
    if (!uid || !leaderboard?.length) return null
    const idx = leaderboard.findIndex((r) => r.user_id === uid)
    if (idx === -1) return null
    return {
      position: competitionRanks(leaderboard)[idx],
      total: leaderboard.length,
    }
  }, [session, leaderboard])
  const onPodium = podium.some((s) => s.row.user_id === session?.user.id)

  if (!champion || podium.length === 0) return null

  return (
    <Card
      className={cn(
        "gap-5 animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards animation-duration-[var(--duration-base)] ease-out-cubic",
        className
      )}
    >
      <CardHeader className="grid-cols-[1fr_auto] items-center">
        <SignHeading
          title="Podium"
          sub={`${leaderboard?.length ?? 0} players`}
        />
        <Link
          to="/leaderboard"
          aria-label="See the full leaderboard"
          className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground transition-colors duration-[var(--duration-fast)] hover:bg-primary/85 active:bg-primary/75 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <ArrowUpRight className="size-5" aria-hidden />
        </Link>
      </CardHeader>
      <CardContent className="mt-auto">
        <div className="flex items-end justify-center gap-2">
          {podium.map(({ row, rank, enter }) => (
            <Link
              key={row.user_id}
              to={`/player/${row.user_id}`}
              className="group flex min-w-0 flex-1 flex-col items-center rounded-t-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:max-w-44"
              style={{ "--i": enter } as CSSProperties}
            >
              <div
                className={cn(
                  "flex w-full min-w-0 flex-col items-center px-1 text-center",
                  CONTENT_IN
                )}
                style={contentDelay(enter)}
              >
                {/* The column's press tint lands on the name, padded like a
                    text link's, so a tap shows on phones (which get no hover). */}
                <span
                  title={`@${row.username}`}
                  className="-mx-1 max-w-full truncate rounded-sm px-1 text-[15px] font-bold tracking-tight underline-offset-4 decoration-1 transition-colors duration-[var(--duration-fast)] group-hover:underline group-active:bg-foreground/10"
                >
                  @{row.username}
                </span>
                <span className="text-sm font-medium tabular-nums text-muted-foreground">
                  {row.total_points} pts
                </span>
              </div>
              <div className={cn("relative mt-2.5 w-full", BAR_HEIGHT[rank - 1])}>
                <div
                  className={cn(
                    "podium-bar absolute inset-0 rounded-t-xl",
                    BAR_TONE[rank - 1]
                  )}
                />
                <span
                  className={cn(
                    "absolute inset-x-0 top-2 text-center text-3xl leading-none font-bold tracking-display tabular-nums",
                    rank === 1 ? "text-signal-foreground" : "text-foreground",
                    CONTENT_IN
                  )}
                  style={contentDelay(enter)}
                  aria-label={`${ordinal(rank)} place`}
                >
                  {rank}
                </span>
              </div>
            </Link>
          ))}
        </div>
        {viewer && !onPodium && (
          <p
            className={cn(
              "mt-4 text-center text-sm text-muted-foreground",
              CONTENT_IN
            )}
            // After the podium sequence (gold content lands at ~720ms).
            style={{ animationDelay: "900ms" }}
          >
            You finished{" "}
            <span className="font-semibold text-foreground">
              {ordinal(viewer.position)}
            </span>{" "}
            of {viewer.total}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
