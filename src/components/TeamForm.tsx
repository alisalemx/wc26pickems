import { cn } from "@/lib/utils"

/** A row of small W/D/L pills showing a team's recent form, oldest -> newest
 *  (latest on the right). The frozen pre-tournament snapshot (`pre`) and the
 *  live in-tournament results (`tournament`) form one rolling 5-match window:
 *  the row always shows the 5 most recent matches, so as a team plays World Cup
 *  games the live results push the oldest pre-tournament pills off the left. A
 *  vertical divider marks the pre→tournament boundary when both are visible.
 *  Renders nothing when there's no form on either side, so callers can drop it
 *  in unconditionally. Pills use soft tints over the card — pale green win,
 *  pale red loss, neutral draw — with a near-ink letter. */
type Outcome = "W" | "D" | "L"

/** Total pills shown — pre-tournament + in-tournament combined. */
const MAX_PILLS = 5

const PILL: Record<Outcome, string> = {
  W: "bg-primary/20 text-foreground",
  D: "bg-muted text-foreground",
  L: "bg-destructive/20 text-foreground",
}

function pillsOf(form: string | null | undefined): Outcome[] {
  return (form ?? "")
    .toUpperCase()
    .split("")
    .filter((c): c is Outcome => c === "W" || c === "D" || c === "L")
}

/** A single W/D/L outcome pill — shared by the form row and the team-info modal. */
export function FormPill({
  outcome,
  className,
}: {
  outcome: Outcome
  className?: string
}) {
  return (
    <span
      className={cn(
        "grid size-4 place-items-center rounded-sm text-[10px] font-bold leading-none",
        PILL[outcome],
        className
      )}
    >
      {outcome}
    </span>
  )
}

export function TeamForm({
  pre,
  tournament,
  className,
}: {
  pre?: string | null
  tournament?: string | null
  className?: string
}) {
  const allPre = pillsOf(pre)
  const allTour = pillsOf(tournament)
  if (allPre.length === 0 && allTour.length === 0) return null

  // One rolling 5-match window: tournament results fill from the right, and
  // whatever room is left shows the most recent pre-tournament pills. Once a
  // team has played 5+ World Cup games, no pre-tournament pills remain.
  const tourP = allTour.slice(Math.max(0, allTour.length - MAX_PILLS))
  const preP = allPre.slice(
    Math.max(0, allPre.length - Math.max(0, MAX_PILLS - tourP.length))
  )

  const label =
    "Recent form, oldest to newest: " +
    [preP.join(" "), tourP.join(" ")].filter(Boolean).join(" then in tournament ")

  return (
    <div
      className={cn("flex items-center justify-center gap-1", className)}
      aria-label={label}
    >
      {preP.map((o, i) => (
        <FormPill key={`p${i}`} outcome={o} />
      ))}
      {preP.length > 0 && tourP.length > 0 && (
        <span aria-hidden className="mx-0.5 h-4 w-px bg-ink/40" />
      )}
      {tourP.map((o, i) => (
        <FormPill key={`t${i}`} outcome={o} />
      ))}
    </div>
  )
}
