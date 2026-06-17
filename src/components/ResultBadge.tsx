import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ResultType } from "@/lib/types"

export function ResultBadge({
  result,
  points,
}: {
  result: ResultType
  points: number
}) {
  const enter =
    "animate-in fade-in-0 zoom-in-95 fill-mode-backwards duration-[var(--duration-base)] ease-out-cubic"
  if (result === "EXACT") {
    return <Badge variant="gold" className={enter}>Exact +{points}</Badge>
  }
  if (result === "OUTCOME") {
    return <Badge variant="default" className={enter}>Outcome +{points}</Badge>
  }
  return (
    <Badge variant="outline" className={cn("text-muted-foreground", enter)}>
      Miss +0
    </Badge>
  )
}
