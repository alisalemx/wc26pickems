import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** Single score box — the one place the predict cards and admin agree on
 *  sizing, digit-sanitizing, and the muted/locked look. Restyle here, not
 *  inline, so the boxes never drift between views. */
export function ScoreInput({
  value,
  onChange,
  label,
  disabled,
  muted,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  disabled?: boolean
  /** Fill the box (muted bg) so a locked/non-editable score reads as disabled
   *  rather than just dimmed. */
  muted?: boolean
}) {
  return (
    <Input
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={2}
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 2))}
      className={cn(
        // md:text-2xl is required, not redundant: the base Input class ends in
        // `md:text-sm`, which would otherwise shrink the score to text-sm at md+.
        "h-12 w-12 text-center text-xl font-bold tabular-nums md:text-xl",
        muted && "bg-muted text-muted-foreground disabled:opacity-60"
      )}
    />
  )
}

/** The `home – away` score-entry pair shared by MatchCard and Admin. */
export function ScorePair({
  home,
  away,
  onHome,
  onAway,
  homeLabel,
  awayLabel,
  disabled,
  muted,
}: {
  home: string
  away: string
  onHome: (value: string) => void
  onAway: (value: string) => void
  homeLabel: string
  awayLabel: string
  disabled?: boolean
  muted?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      <ScoreInput
        value={home}
        onChange={onHome}
        label={homeLabel}
        disabled={disabled}
        muted={muted}
      />
      <span className="text-muted-foreground">–</span>
      <ScoreInput
        value={away}
        onChange={onAway}
        label={awayLabel}
        disabled={disabled}
        muted={muted}
      />
    </div>
  )
}
