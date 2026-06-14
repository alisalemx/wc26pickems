import { cn } from "@/lib/utils"

/** A row of small W/D/L pills showing a team's recent form, oldest -> newest
 *  (latest on the right). The frozen pre-tournament snapshot (`pre`, up to 5
 *  games) is separated from the live in-tournament results (`tournament`) by a
 *  vertical divider. Renders nothing when there's no form on either side, so
 *  callers can drop it in unconditionally. Colours come from the theme tokens:
 *  win = primary green, loss = destructive red, draw = muted neutral. */
type Outcome = "W" | "D" | "L"

const PILL: Record<Outcome, string> = {
  W: "bg-primary text-primary-foreground",
  D: "bg-muted text-muted-foreground border border-border",
  L: "bg-destructive text-destructive-foreground",
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
  const preP = pillsOf(pre)
  const tourP = pillsOf(tournament)
  if (preP.length === 0 && tourP.length === 0) return null

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
