import { ArrowRight, Trophy } from "lucide-react"
import { FINAL_ID } from "@/lib/bracket"
import { isPredictionLocked } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { MatchRow, PredictionRow } from "@/lib/types"

interface Props {
  matches: MatchRow[] | undefined
  predictions: Record<number, PredictionRow> | undefined
  signedIn: boolean
  /** Called with the earliest-kickoff open match when the banner is clicked. */
  onGoToNext: (m: MatchRow) => void
}

/** A one-line CTA panel above the match list telling a signed-in user how
 *  many matches are still open for them to predict. Clicking it jumps to the
 *  next (earliest-kickoff) open match. Not dismissable — it disappears on its
 *  own once every open match has a pick. */
export function PredictReminder({
  matches,
  predictions,
  signedIn,
  onGoToNext,
}: Props) {
  if (!signedIn) return null
  if (!matches || !predictions) return null

  // Mirror MatchCard's `predictable` gate: a knockout slot whose teams were
  // derived client-side from feeder winners (`teams_provisional`) shows its
  // teams but isn't saveable yet — the DB row is still blank, so RLS rejects a
  // pick. Counting it here made the banner say "1 match open, predict next"
  // while the card itself read "Opens shortly". Exclude those until the server
  // fills the slot.
  const open = matches.filter(
    (m) =>
      !isPredictionLocked(m) &&
      m.home_team != null &&
      m.away_team != null &&
      !m.teams_provisional &&
      !predictions[m.id]
  )

  if (open.length === 0) return null

  // Earliest kickoff first; tiebreak on id (the input array isn't guaranteed
  // to be sorted).
  const next = open.reduce((a, b) =>
    b.kickoff < a.kickoff || (b.kickoff === a.kickoff && b.id < a.id) ? b : a
  )

  // Once the jump target is the Final itself, the panel trades its usual black
  // ground for the one bold colour (turf green) to hype the last match.
  const isFinal = next.id === FINAL_ID

  return (
    // The entrance lives on a wrapper: `ease-*` utilities set the transition
    // and the animate-in easing alike, so keeping them on one element would
    // make the hover transition and the entrance fight over the same custom
    // property.
    <div className="animate-in fade-in-0 slide-in-from-top-1 animation-duration-[var(--duration-base)] ease-out-cubic">
      {/* A signage numbered panel: the count in a bullet, the destination,
          and an arrow in a circle. */}
      <button
        type="button"
        onClick={() => onGoToNext(next)}
        className={cn(
          "group flex w-full cursor-pointer items-center gap-3 rounded-xl p-2.5 pr-3 text-left transition-colors duration-[var(--duration-fast)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
          isFinal
            ? "bg-signal text-signal-foreground hover:bg-signal/90 active:bg-signal/80"
            : "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
        )}
      >
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-full text-lg font-bold tabular-nums tracking-tight",
            isFinal
              ? "bg-signal-foreground text-signal"
              : "bg-signal text-signal-foreground"
          )}
        >
          {isFinal ? (
            <Trophy className="size-5" aria-hidden />
          ) : (
            open.length
          )}
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[15px] font-bold tracking-tight">
            {isFinal
              ? "The Final is open"
              : `${open.length === 1 ? "Match" : "Matches"} open for predictions`}
          </span>
          <span className="truncate text-sm opacity-60">
            {isFinal ? "Make your call" : "Predict next"}
          </span>
        </span>
        <span
          className={cn(
            "ml-auto grid size-9 shrink-0 place-items-center rounded-full transition-transform duration-[var(--duration-fast)] ease-out group-hover:translate-x-0.5",
            isFinal
              ? "bg-signal-foreground text-signal"
              : "bg-primary-foreground text-primary"
          )}
        >
          <ArrowRight className="size-[18px]" aria-hidden />
        </span>
      </button>
    </div>
  )
}
