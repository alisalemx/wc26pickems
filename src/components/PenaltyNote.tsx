import { useState } from "react"
import { Info, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScoringGuide } from "@/components/ScoringGuide"

// Persist the dismissal so the reminder doesn't reappear on every visit. Read
// lazily (and defensively) so SSR/blocked-storage environments never throw.
const DISMISS_KEY = "penalty-note-dismissed"

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1"
  } catch {
    return false
  }
}

/** A one-time, dismissable reminder above the match list: penalty shootouts
 *  don't count toward a prediction. Links into the same scoring dialog the
 *  Leaderboard uses. */
export function PenaltyNote() {
  const [dismissed, setDismissed] = useState(readDismissed)
  const [closing, setClosing] = useState(false)
  if (dismissed) return null

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1")
    } catch {
      // Storage may be unavailable (private mode); dismiss for this session only.
    }
    setClosing(true)
  }

  return (
    // Reuses the grid-rows collapse idiom (see RevealedPicks in MatchCard) so
    // dismissal collapses the space instead of unmounting instantly. Under
    // reduced motion the global backstop makes the transition near-instant,
    // but transitionend still fires and the note still unmounts.
    <div
      className="grid transition-[grid-template-rows,opacity] duration-[var(--duration-exit)] ease-in-out-quart"
      style={{ gridTemplateRows: closing ? "0fr" : "1fr", opacity: closing ? 0 : 1 }}
      onTransitionEnd={(e) => {
        // transitionend fires per property; guard on the target/property so the
        // opacity leg (same duration here) can't unmount before grid-rows settles.
        if (e.target === e.currentTarget && e.propertyName === "grid-template-rows") {
          setDismissed(true)
        }
      }}
    >
      <div className="overflow-hidden">
        <Alert className="animate-in fade-in-0 slide-in-from-top-1 pr-9 duration-[var(--duration-base)] ease-out-cubic">
          <Info />
          <AlertDescription>
            <p>
              Penalty shootouts don't count toward the exact score. Only the result
              after 90' + extra time counts.{" "}
              <ScoringGuide
                trigger={
                  <button className="rounded-sm -mx-1 px-1 font-medium text-primary underline underline-offset-2 transition-colors duration-[var(--duration-fast)] hover:no-underline active:bg-foreground/10">
                    How scoring works
                  </button>
                }
              />
            </p>
          </AlertDescription>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss reminder"
            className="absolute right-2 top-2 rounded-sm p-1 text-muted-foreground transition-colors duration-[var(--duration-fast)] hover:text-foreground active:bg-foreground/10"
          >
            <X className="size-4" aria-hidden />
          </button>
        </Alert>
      </div>
    </div>
  )
}
