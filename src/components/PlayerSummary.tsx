import type { CSSProperties, ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Bullet } from "@/components/Bullet"
import { Flag } from "@/components/Flag"
import { ResultBadge } from "@/components/ResultBadge"
import { SignHeading } from "@/components/SignHeading"
import { StageBadge } from "@/components/StageBadge"
import { ordinal } from "@/lib/format"
import type { MatchRow, ResultType } from "@/lib/types"
import { cn } from "@/lib/utils"

/** A player's standing as a signage numbered panel: the rank in a large line
 *  bullet (green for the leader) beside the two-tone "2nd place / of 6
 *  players", then the stats set as big numbers. The rank bullet gets the
 *  one-shot `.rank-pop` reveal. Before scoring starts there's no rank, so only
 *  the stats show. `footer` carries the line under the stats (matches left, or
 *  the tournament-complete wrap). */
export function RankSummary({
  rank,
  stats,
  footer,
  className,
}: {
  rank: { position: number; total: number } | null
  stats: { label: string; value: ReactNode }[]
  footer?: ReactNode
  className?: string
}) {
  return (
    <Card
      className={cn(
        "gap-6 animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards animation-duration-[var(--duration-base)] ease-out-cubic",
        className
      )}
    >
      <CardContent className="flex flex-col gap-6">
        {rank && (
          <div className="flex items-center gap-4">
            <Bullet
              tone={rank.position === 1 ? "signal" : "ink"}
              className="rank-pop size-20 text-4xl tracking-display"
              label={`${ordinal(rank.position)} place`}
            >
              {rank.position}
            </Bullet>
            <SignHeading
              size="lg"
              title={`${ordinal(rank.position)} place`}
              sub={`of ${rank.total} ${rank.total === 1 ? "player" : "players"}`}
            />
          </div>
        )}
        <dl
          className="grid divide-x divide-border"
          style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col gap-1 px-3 first:pl-0 last:pr-0"
            >
              <dd className="text-3xl leading-none font-bold tabular-nums tracking-tight">
                {s.value}
              </dd>
              <dt className="text-[13px] text-muted-foreground">{s.label}</dt>
            </div>
          ))}
        </dl>
        {footer && (
          <div className="border-t border-border pt-4 text-sm text-muted-foreground">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** One settled pick in a dense list: the match result on the first line, the
 *  stage and the pick under it, and the points badge on the right. Rows sit
 *  in one panel separated by hairlines (see SettledList). */
export function PickRow({
  match: m,
  homePred,
  awayPred,
  result,
  points,
  index,
}: {
  match: MatchRow
  homePred: number
  awayPred: number
  result: ResultType | null
  points: number
  /** Position in the list — drives the entrance stagger. */
  index: number
}) {
  return (
    <li
      className="flex items-center justify-between gap-3 py-3 animate-in fade-in-0 slide-in-from-bottom-1 animation-duration-[var(--duration-base)] ease-out-cubic stagger-in"
      style={{ "--i": index } as CSSProperties}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-2 text-[15px] font-semibold tracking-tight">
          <Flag code={m.home_code} size="sm" />
          <span className="truncate">
            {m.home_team}{" "}
            <span className="tabular-nums">
              {m.home_score}–{m.away_score}
            </span>{" "}
            {m.away_team}
          </span>
          <Flag code={m.away_code} size="sm" />
        </div>
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <StageBadge stage={m.stage} group={m.group_name} className="h-5 px-2 text-[11px]" />
          <span className="tabular-nums">
            Pick {homePred}–{awayPred}
          </span>
        </div>
      </div>
      {result && <ResultBadge result={result} points={points} />}
    </li>
  )
}

/** The panel that holds the settled picks: a heading, the filter control, and
 *  the hairline-divided rows, or `empty` in their place when there are none.
 *  The panel itself stays still: its rows cascade in (PickRow), and a second
 *  entrance here would stack on theirs. */
export function SettledList({
  title,
  filter,
  empty,
  children,
  className,
}: {
  title: string
  filter?: ReactNode
  empty?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn("gap-4", className)}>
      <CardContent className="flex flex-col gap-4">
        <SignHeading title={title} size="md" as="h2" />
        {filter}
        {empty ?? <ul className="-mt-1 divide-y divide-border">{children}</ul>}
      </CardContent>
    </Card>
  )
}
