import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** A single labelled metric in a hairline-bordered box (e.g. the stat grid on
 *  the My Predictions page). `highlight` accents the value in the brand color. */
export function StatCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: ReactNode
  highlight?: boolean
}) {
  return (
    <div className="rounded-lg border p-3">
      <div
        className={cn(
          "text-2xl font-bold tabular-nums",
          highlight && "text-primary"
        )}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
