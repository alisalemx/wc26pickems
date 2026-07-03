import type { ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ResultBadge } from "@/components/ResultBadge"
import { flagEmoji } from "@/lib/flags"
import {
  EXACT_BASE,
  OUTCOME_BASE,
  STAGE_LABEL,
  STAGE_MULTIPLIER,
} from "@/lib/scoring"
import type { MatchStage } from "@/lib/types"

// Stages in tournament order. Mirrors the SQL stage_multiplier(); display only.
const STAGE_ORDER: MatchStage[] = [
  "GROUP",
  "R32",
  "R16",
  "QF",
  "THIRD",
  "SF",
  "FINAL",
]

// Multiplier used in the penalty-shootout worked example (Round of 32, ×1 —
// kept simple so the points are the base values, not scaled).
const EXAMPLE_MULT = STAGE_MULTIPLIER.R32

/** The scoring-rules dialog. Renders its own "Scoring system" link by default;
 *  pass `trigger` to open the same dialog from a custom element (e.g. an inline
 *  link inside the penalty reminder note). */
export function ScoringGuide({ trigger }: { trigger?: ReactNode }) {
  return (
    <Dialog>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger className="flex shrink-0 items-center gap-1 rounded-sm -mx-1 px-1 text-xs font-medium text-primary underline-offset-2 transition-colors duration-[var(--duration-fast)] hover:underline active:bg-foreground/10">
          <Info className="size-3.5" aria-hidden /> Scoring system
        </DialogTrigger>
      )}
      <DialogContent className="top-[5dvh] max-h-[90dvh] translate-y-0 gap-4 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scoring system</DialogTitle>
          <DialogDescription className="sr-only">
            How points are awarded for each prediction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 text-pretty text-sm text-muted-foreground">
          {/* Per-match points */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Points per match
            </h3>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-center gap-2">
                <ResultBadge result="EXACT" points={EXACT_BASE} />
                exact final score
              </li>
              <li className="flex items-center gap-2">
                <ResultBadge result="OUTCOME" points={OUTCOME_BASE} />
                right winner or draw, wrong score
              </li>
              <li className="flex items-center gap-2">
                <ResultBadge result="MISS" points={0} />
                wrong result
              </li>
            </ul>
          </section>

          {/* Stage multipliers */}
          <section className="space-y-2">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                Point multipliers
              </h3>
              <p>
                Points are multiplied by the stage of the match. The deeper
                the round, the more a correct pick is worth.
              </p>
            </div>
            <div className="overflow-hidden rounded-md border border-ink">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Stage</th>
                    <th className="px-3 py-2 text-center font-medium">
                      Multiplier
                    </th>
                    <th className="px-3 py-2 text-center">
                      <Badge variant="gold" className="px-1 py-0 text-[10px]">
                        Exct
                      </Badge>
                    </th>
                    <th className="px-3 py-2 text-center">
                      <Badge
                        variant="default"
                        className="px-1 py-0 text-[10px]"
                      >
                        Outc
                      </Badge>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {STAGE_ORDER.map((stage) => {
                    const mult = STAGE_MULTIPLIER[stage]
                    return (
                      <tr
                        key={stage}
                        className="border-b text-foreground last:border-b-0"
                      >
                        <td className="px-3 py-2">
                          {stage === "GROUP"
                            ? "Group stage"
                            : STAGE_LABEL[stage]}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold tabular-nums">
                          ×{mult}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold tabular-nums">
                          {EXACT_BASE * mult}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold tabular-nums">
                          {OUTCOME_BASE * mult}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Knockout stage / penalty shootouts */}
          <section className="space-y-2">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                Penalty shootouts
              </h3>
              <p>
                If a knockout match goes to penalties, your prediction is
                judged on the score after extra time. The shootout only decides
                who advances, never your points. For example:
              </p>
            </div>
            <div className="space-y-4 pt-1">
              <div className="rounded-md border border-ink bg-muted/40 p-3">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <Badge variant="secondary">{STAGE_LABEL.R32}</Badge>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <span className="text-xl leading-none">
                      {flagEmoji("ARG")}
                    </span>
                    Argentina
                  </span>
                  <span className="text-base font-semibold tabular-nums text-foreground">
                    1-1
                  </span>
                  <span className="flex items-center justify-end gap-2 font-medium text-foreground">
                    Brazil
                    <span className="text-xl leading-none">
                      {flagEmoji("BRA")}
                    </span>
                  </span>
                </div>
                <p className="mt-1.5 text-center text-xs">
                  Argentina won 4-2 on penalties
                </p>
              </div>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-center gap-2">
                  <span className="w-16 font-medium text-foreground">
                    Player 1
                  </span>
                  <span className="w-12 rounded border border-border py-0.5 text-center font-medium tabular-nums text-foreground">
                    1-1
                  </span>
                  <ResultBadge
                    result="EXACT"
                    points={EXACT_BASE * EXAMPLE_MULT}
                  />
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-16 font-medium text-foreground">
                    Player 2
                  </span>
                  <span className="w-12 rounded border border-border py-0.5 text-center font-medium tabular-nums text-foreground">
                    2-2
                  </span>
                  <ResultBadge
                    result="OUTCOME"
                    points={OUTCOME_BASE * EXAMPLE_MULT}
                  />
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-16 font-medium text-foreground">
                    Player 3
                    <span className="ml-0.5 align-super text-[9px] text-muted-foreground">
                      *
                    </span>
                  </span>
                  <span className="w-12 rounded border border-border py-0.5 text-center font-medium tabular-nums text-foreground">
                    2-1
                  </span>
                  <ResultBadge result="MISS" points={0} />
                </li>
              </ul>
              <p>
                * Player 3 misses on points, even though they correctly picked
                Argentina to advance, since the penalty shootout doesn't count.
              </p>
            </div>
          </section>

          {/* Leaderboard tie-breakers */}
          <section className="space-y-2">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                Leaderboard tie-breakers
              </h3>
              <p>Ties on points are broken in this order:</p>
            </div>
            {/* Tailwind's preflight strips <ol> numbering, so numbers are
                explicit. */}
            <ol className="space-y-1.5 text-xs">
              <li className="flex items-center gap-2">
                <span className="font-semibold tabular-nums text-foreground">
                  1.
                </span>
                <ResultBadge result="EXACT" />
                more exact scores
              </li>
              <li className="flex items-center gap-2">
                <span className="font-semibold tabular-nums text-foreground">
                  2.
                </span>
                <ResultBadge result="OUTCOME" />
                more correct outcomes
              </li>
              <li className="flex items-center gap-2">
                <span className="font-semibold tabular-nums text-foreground">
                  3.
                </span>
                <ResultBadge result="MISS" />
                fewer misses
              </li>
            </ol>
            <p>Still tied on all three? The players share the rank.</p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
