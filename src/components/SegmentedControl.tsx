import { useState, type ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"

export type SegmentedOption<T> = { value: T; label: ReactNode }

/** Single-select segmented control: equal-width chips in a rounded track with a
 *  single shared-layout ink "pill" (`layoutId`) that glides to the active chip
 *  when you switch; the active label is raised so the pill stays beneath it
 *  mid-slide. Matches the Tabs strip, so every switcher in the app reads alike. Chips are `flex-1`, so they share one row instead
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
  // The pill is a layout-projected (`layoutId`) element, so Motion animates ANY
  // change to its layout box — including when content above it loads in (e.g. the
  // `/me` rank card swaps a skeleton for taller real content) and pushes the whole
  // control downward, which made the pill "fall from the top" on load. So only
  // glide on a real user switch: arm the spring from the click handler and disarm
  // it once the glide completes. Every other render — mount, data-load reflow,
  // count-label updates — keeps `glide` false and snaps the pill instantly.
  const [glide, setGlide] = useState(false)
  const select = (next: T) => {
    if (next !== value && !reduceMotion) setGlide(true)
    onChange(next)
  }
  return (
    <div className={cn("flex h-11 rounded-full bg-track p-1", className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => select(o.value)}
            aria-current={active ? true : undefined}
            className={cn(
              "relative flex-1 rounded-full px-2.5 text-[13px] font-semibold whitespace-nowrap sm:text-sm transition-[color,background-color] duration-[var(--duration-fast)] outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "z-10 text-primary-foreground"
                : "text-muted-foreground hover:text-foreground active:bg-foreground/10"
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                aria-hidden
                className="absolute inset-0 bg-primary"
                // Inline so Motion can correct it mid-glide (see TabsTrigger).
                style={{ borderRadius: 9999 }}
                transition={
                  glide
                    ? { type: "spring", duration: 0.4, bounce: 0.2 }
                    : { duration: 0 }
                }
                onLayoutAnimationComplete={() => setGlide(false)}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
