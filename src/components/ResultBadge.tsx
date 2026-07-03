import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ResultType } from "@/lib/types"

/** Omit `points` to render just the label (e.g. in the scoring guide's
 *  tie-breaker list, where the badge names the category, not a score). */
export function ResultBadge({
  result,
  points,
}: {
  result: ResultType
  points?: number
}) {
  const enter =
    "animate-in fade-in-0 zoom-in-95 fill-mode-backwards duration-[var(--duration-base)] ease-out-cubic"
  const pts = points === undefined ? "" : ` +${points}`
  if (result === "EXACT") {
    return <Badge variant="gold" className={enter}>Exact{pts}</Badge>
  }
  if (result === "OUTCOME") {
    return <Badge variant="default" className={enter}>Outcome{pts}</Badge>
  }
  return (
    <Badge variant="outline" className={cn("text-muted-foreground", enter)}>
      Miss{points === undefined ? "" : " +0"}
    </Badge>
  )
}
