import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const TONE = {
  ink: "bg-primary text-primary-foreground",
  signal: "bg-signal text-signal-foreground",
  win: "bg-win text-win-foreground",
  loss: "bg-destructive text-destructive-foreground",
  muted: "bg-muted text-foreground",
  outline: "text-muted-foreground shadow-[inset_0_0_0_1.5px_var(--input)]",
} as const

const SIZE = {
  xs: "size-5 text-[11px]",
  sm: "size-6 text-xs",
  md: "size-8 text-sm",
  lg: "size-11 text-lg",
  xl: "size-16 text-3xl",
} as const

/** The Signage line bullet: a short number or letter in a flat colour disc,
 *  like a subway route sign. Used for ranks, group letters, and W/D/L form.
 *  Keep only a few coloured bullets in any one view; `muted` and `outline`
 *  are the quiet tones for everything else. */
export function Bullet({
  children,
  tone = "ink",
  size = "md",
  className,
  label,
}: {
  children: ReactNode
  tone?: keyof typeof TONE
  size?: keyof typeof SIZE
  className?: string
  /** Accessible name when the glyph alone isn't enough, e.g. "Rank 2". */
  label?: string
}) {
  return (
    <span
      aria-label={label}
      role={label ? "img" : undefined}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-bold leading-none tabular-nums tracking-tight select-none",
        TONE[tone],
        SIZE[size],
        className
      )}
    >
      {children}
    </span>
  )
}
