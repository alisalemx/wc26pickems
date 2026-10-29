import { Badge } from "@/components/ui/badge"
import type { ResultType } from "@/lib/types"

/** Omit `points` to render just the label (e.g. in the scoring guide's
 *  tie-breaker list, where the badge names the category, not a score). No
 *  entrance of its own: it always sits inside a card, row, or dialog that
 *  already animates in. */
export function ResultBadge({
  result,
  points,
}: {
  result: ResultType
  points?: number
}) {
  const pts = points === undefined ? "" : ` +${points}`
  if (result === "EXACT") {
    return <Badge variant="signal">Exact{pts}</Badge>
  }
  if (result === "OUTCOME") {
    return <Badge variant="win">Outcome{pts}</Badge>
  }
  return (
    <Badge variant="outline">
      Miss{points === undefined ? "" : " +0"}
    </Badge>
  )
}
