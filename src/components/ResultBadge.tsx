import { Badge } from "@/components/ui/badge"
import type { ResultType } from "@/lib/types"

export function ResultBadge({
  result,
  points,
}: {
  result: ResultType
  points: number
}) {
  if (result === "EXACT") {
    return <Badge variant="gold">Exact +{points}</Badge>
  }
  if (result === "OUTCOME") {
    return <Badge variant="default">Outcome +{points}</Badge>
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Miss +0
    </Badge>
  )
}
