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
import { flagEmoji } from "@/lib/flags"
import {
  EXACT_BASE,
  OUTCOME_BASE,
  STAGE_LABEL,
  STAGE_MULTIPLIER,
} from "@/lib/scoring"
import type { MatchStage } from "@/lib/types"
import { cn } from "@/lib/utils"

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

// Multiplier used in the penalty-shootout worked example (the Final).
const KO_MULT = STAGE_MULTIPLIER.FINAL

export function ScoringGuide() {
  return (
    <Dialog>
      <DialogTrigger className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline">
        <Info className="size-3.5" aria-hidden /> Scoring system
      </DialogTrigger>
      <DialogContent className="top-[5%] max-h-[90vh] translate-y-0 gap-6 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scoring system</DialogTitle>
          <DialogDescription className="sr-only">
            How points are awarded for each prediction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 text-sm text-muted-foreground">
          {/* Per-match points */}
          <ul className="space-y-1.5 text-xs">
            <li className="flex items-center gap-2">
              <Badge variant="gold" className="w-9">
                +{EXACT_BASE}
              </Badge>
              <span className="font-medium text-foreground">Exact score</span>
              both numbers right
            </li>
            <li className="flex items-center gap-2">
              <Badge variant="default" className="w-9">
                +{OUTCOME_BASE}
              </Badge>
              <span className="font-medium text-foreground">Right outcome</span>
              correct winner or draw
            </li>
            <li className="flex items-center gap-2">
              <Badge variant="secondary" className="w-9">
                0
              </Badge>
              <span className="font-medium text-foreground">Miss</span>
            </li>
          </ul>

          {/* Stage multipliers */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Multipliers
            </h3>
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
                        <td className="px-3 py-2 text-center">
                          <span
                            className={cn(
                              "font-semibold tabular-nums",
                              mult >= 3 && "text-gold-foreground"
                            )}
                          >
                            ×{mult}
                          </span>
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
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Scoring in case of penalties
            </h3>
            <p>
              Only the score after 90 minutes and extra time counts toward your
              prediction; a penalty shootout does not. For example:
            </p>
            <div className="space-y-4 pt-1">
              <div className="rounded-md border border-ink bg-muted/40 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge variant="outline">Final</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    ×{KO_MULT} point multiplier applied
                  </span>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <span className="text-xl leading-none">
                      {flagEmoji("BRA")}
                    </span>
                    Brazil
                  </span>
                  <span className="text-base font-semibold tabular-nums text-foreground">
                    1-1
                  </span>
                  <span className="flex items-center justify-end gap-2 font-medium text-foreground">
                    Argentina
                    <span className="text-xl leading-none">
                      {flagEmoji("ARG")}
                    </span>
                  </span>
                </div>
                <p className="mt-1.5 text-center text-xs">
                  Argentina won on penalties
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
                  <Badge variant="gold" className="w-9">
                    +{EXACT_BASE * KO_MULT}
                  </Badge>
                  <span className="font-medium text-foreground">Exact</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-16 font-medium text-foreground">
                    Player 2
                  </span>
                  <span className="w-12 rounded border border-border py-0.5 text-center font-medium tabular-nums text-foreground">
                    2-2
                  </span>
                  <Badge variant="default" className="w-9">
                    +{OUTCOME_BASE * KO_MULT}
                  </Badge>
                  <span className="font-medium text-foreground">Outcome</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-16 font-medium text-foreground">
                    Player 3
                  </span>
                  <span className="w-12 rounded border border-border py-0.5 text-center font-medium tabular-nums text-foreground">
                    1-2
                  </span>
                  <Badge variant="secondary" className="w-9">
                    0
                  </Badge>
                  <span className="font-medium text-foreground">
                    Miss
                    <span className="align-super text-[9px] text-muted-foreground">
                      *
                    </span>
                  </span>
                </li>
              </ul>
              <p className="text-xs">
                * Player 3 misses on points, even though they correctly picked
                Argentina to advance, since the penalty shootout doesn't count.
              </p>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
