import type { ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"

export type SegmentedOption<T> = { value: T; label: ReactNode }

/** Single-select segmented control: equal-width chips on a muted track with a
 *  single shared-layout "pill" (`layoutId`) that glides to the active chip when
 *  you switch, riding over the track; the active label is raised so the pill
 *  stays beneath it mid-slide. Chips are `flex-1`, so they share one row instead
 *  of wrapping on narrow screens. Used for the bracket round selector and the
 *  `/me` settled-match filter. `layoutId` must be unique per mounted instance. */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  layoutId,
  className,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  layoutId: string
  className?: string
}) {
  const reduceMotion = useReducedMotion()
  return (
    <div className={cn("flex gap-1.5", className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            aria-current={active ? true : undefined}
            className={cn(
              "relative flex-1 rounded-md bg-muted px-2.5 py-1.5 text-sm font-medium transition-[color,transform] duration-[var(--duration-fast)] active:scale-[0.97]",
              active
                ? "z-10 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                aria-hidden
                className="absolute inset-0 rounded-md border border-ink bg-background shadow-brutal-sm"
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", duration: 0.4, bounce: 0.2 }
                }
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
