import { ChevronRight, Zap } from "lucide-react"
import { isLocked } from "@/lib/format"
import type { MatchRow, PredictionRow } from "@/lib/types"

interface Props {
  matches: MatchRow[] | undefined
  predictions: Record<number, PredictionRow> | undefined
  signedIn: boolean
  /** Called with the earliest-kickoff open match when the banner is clicked. */
  onGoToNext: (m: MatchRow) => void
}

/** A gold one-line CTA banner above the match list telling a signed-in user how
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
      !isLocked(m.kickoff) &&
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

  return (
    // The entrance lives on a wrapper: `duration-*`/`ease-*` utilities set the
    // transition and the animate-in timing alike, so keeping them on one
    // element would make the hover transition and the entrance fight over the
    // same custom properties.
    <div className="animate-in fade-in-0 slide-in-from-top-1 duration-[var(--duration-base)] ease-out-cubic">
      <button
        type="button"
        onClick={() => onGoToNext(next)}
        className="predict-cta flex w-full cursor-pointer items-center gap-2 rounded-lg border border-ink px-4 py-3 text-sm transition-colors duration-[var(--duration-fast)] active:bg-foreground/10"
      >
        <Zap className="size-4 shrink-0" aria-hidden />
        {/* The tail is dropped instead of truncated where space is tight. */}
        <span className="whitespace-nowrap font-semibold">
          <span className="tabular-nums">{open.length}</span> match
          {open.length === 1 ? "" : "es"} open
          <span className="hidden sm:inline"> for predictions</span>
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1 font-semibold">
          Predict next
          <ChevronRight className="size-4" aria-hidden />
        </span>
      </button>
    </div>
  )
}
