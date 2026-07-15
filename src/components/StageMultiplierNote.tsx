import { useState } from "react"
import { Info, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScoringGuide } from "@/components/ScoringGuide"
import { STAGE_MULTIPLIER } from "@/lib/scoring"
import type { MatchStage } from "@/lib/types"

// Persist the dismissal keyed by the stage it was dismissed at, so the reminder
// reappears when the tournament advances into a new (higher-value) round. Read
// lazily (and defensively) so SSR/blocked-storage environments never throw.
const DISMISS_KEY = "stage-multiplier-note-dismissed"

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY)
  } catch {
    return null
  }
}

// One short line per knockout round, describing what a pick there is worth.
// Only stages with a multiplier above ×1 get a note (GROUP and R32 are ×1 and
// keep the penalty reminder instead). The ×N pulls from STAGE_MULTIPLIER.
const STAGE_COPY: Partial<Record<MatchStage, string>> = {
  R16: "Round of 16 picks are worth",
  QF: "Quarter-final picks are worth",
  SF: "Semi-final picks are worth",
  THIRD: "Third-place play-off picks are worth",
  FINAL: "The Final is worth",
}

/** A dismissable reminder above the match list once the knockouts reach a
 *  points-multiplied round (R16 onward): the current stage is worth more.
 *  Replaces the PenaltyNote from R16 on, and its copy tracks the round the
 *  tournament has reached (R16 → QF → SF → THIRD/Final). Links into the same
 *  scoring dialog the Leaderboard uses. */
export function StageMultiplierNote({ stage }: { stage: MatchStage }) {
  const [dismissedStage, setDismissedStage] = useState(readDismissed)
  const [closing, setClosing] = useState(false)
  // Reappears when the round advances: a stale dismissal (an earlier stage) no
  // longer matches the current one, so the note shows again for the new round.
  if (dismissedStage === stage) return null

  const copy = STAGE_COPY[stage]
  if (!copy) return null

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, stage)
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
          setDismissedStage(stage)
        }
      }}
    >
      <div className="overflow-hidden">
        <Alert className="animate-in fade-in-0 slide-in-from-top-1 pr-9 duration-[var(--duration-base)] ease-out-cubic">
          <Info />
          <AlertDescription>
            <p>
              {copy} ×{STAGE_MULTIPLIER[stage]} the points.{" "}
              <ScoringGuide
                trigger={
                  <button className="rounded-sm -mx-1 px-1 font-medium text-primary underline underline-offset-2 transition-colors duration-[var(--duration-fast)] hover:no-underline active:bg-foreground/10">
                    See scoring system
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
