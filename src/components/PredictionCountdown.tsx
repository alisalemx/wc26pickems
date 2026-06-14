import { Clock, Lock } from "lucide-react"
import { useCountdown } from "@/hooks/useCountdown"
import { formatCountdown } from "@/lib/format"
import { cn } from "@/lib/utils"

const URGENT_MS = 10 * 60_000 // last 10 minutes turn urgent

/** Live "time left to predict" indicator for a match card. Counts down to
 *  `kickoff`, when predictions lock; the card header pairs it with the absolute
 *  kickoff time. Falls back to the locked label if the deadline passes while on
 *  screen (before the next data poll re-renders the parent). Styling turns
 *  urgent inside the final ten minutes. */
export function PredictionCountdown({
  kickoff,
  className,
}: {
  kickoff: string
  className?: string
}) {
  const msLeft = useCountdown(kickoff)
  const label = formatCountdown(kickoff)

  if (label == null || msLeft <= 0) {
    return (
      <span className={cn("flex items-center gap-1", className)}>
        <Lock className="size-3" /> Locked
      </span>
    )
  }

  // Render as a colon clock. Split on ":" and lay the pieces out as flex items
  // so each separator gets its own span — vertically centered on the digits
  // (the glyph otherwise sits low) and given a little horizontal breathing
  // room. The most-significant chunk may carry a "3d " prefix; it just rides
  // along on the first segment.
  const segments = label.split(":")

  return (
    <span
      className={cn(
        "inline-flex items-center tabular-nums",
        msLeft <= URGENT_MS && "font-medium text-destructive",
        className
      )}
    >
      <Clock aria-hidden className="mr-1 size-3" />
      {segments.flatMap((seg, i) =>
        i === 0
          ? [<span key={`n${i}`}>{seg}</span>]
          : [
              <span
                key={`c${i}`}
                aria-hidden
                className="mx-0.5 -translate-y-[0.1em]"
              >
                :
              </span>,
              <span key={`n${i}`}>{seg}</span>,
            ]
      )}
    </span>
  )
}
