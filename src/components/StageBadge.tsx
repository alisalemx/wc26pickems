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
  // Every round shares one flat tag; only the Final is set apart, with a richer
  // gold-gradient background (the `.stage-final` treatment).
  const isFinal = stage === "FINAL"
  return (
    <Badge
      variant={isFinal ? "gold" : "secondary"}
      className={cn("font-medium", isFinal && "stage-final", className)}
    >
      {label}
      {mult > 1 && <span className="opacity-80">×{mult}</span>}
    </Badge>
  )
}
