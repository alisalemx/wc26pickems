import { Badge } from "@/components/ui/badge"
import { STAGE_SHORT, STAGE_MULTIPLIER } from "@/lib/scoring"
import type { MatchStage } from "@/lib/types"
import { cn } from "@/lib/utils"

export function StageBadge({
  stage,
  group,
  className,
}: {
  stage: MatchStage
  group?: string | null
  className?: string
}) {
  const label =
    stage === "GROUP" && group ? `Group ${group}` : STAGE_SHORT[stage]
  const mult = STAGE_MULTIPLIER[stage]
  // Every round shares one flat grey tag; only the Final is set apart, in the
  // one bold colour (turf green).
  const isFinal = stage === "FINAL"
  return (
    <Badge
      variant={isFinal ? "signal" : "secondary"}
      className={cn("gap-1.5", className)}
    >
      {label}
      {mult > 1 && (
        <span className={isFinal ? "opacity-70" : "text-muted-foreground"}>
          ×{mult}
        </span>
      )}
    </Badge>
  )
}
