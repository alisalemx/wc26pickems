import { ArrowLeft, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SignHeading } from "@/components/SignHeading"
import { cn } from "@/lib/utils"

/** Sticky day strip used in the Matches views: a floating frosted pill, like
 *  the top bar, that parks just beneath it (`--sticky-top` in index.css). When
 *  `onPrev`/`onNext` are given it renders the arrow-nav variant (day-by-day
 *  browsing): on phones the arrows sit at the pill's ends around a centred
 *  heading, and from md up the heading aligns left with the arrows grouped on
 *  the right. Otherwise it's a plain section heading (the all-matches list).
 *  The arrows are the signage "arrow in a circle", inset so they stay
 *  concentric with the pill's rounded ends. */
export function DayHeader({
  heading,
  isToday,
  subtitle,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
}: {
  heading: string
  isToday?: boolean
  subtitle?: string
  onPrev?: () => void
  onNext?: () => void
  prevDisabled?: boolean
  nextDisabled?: boolean
}) {
  const nav = onPrev || onNext
  const title = (
    <span className="inline-flex items-center gap-2">
      {heading}
      {isToday && <Badge variant="signal">Today</Badge>}
    </span>
  )

  return (
    <div
      data-day-strip
      className={cn(
        "sticky top-(--sticky-top) z-(--z-sticky) flex items-center gap-3 rounded-full bg-bar backdrop-blur-xl backdrop-saturate-150",
        nav ? "p-2 md:pl-6" : "px-5 py-3"
      )}
    >
      {nav && (
        <ArrowButton
          direction="prev"
          disabled={prevDisabled}
          onClick={onPrev}
          className="md:order-2 md:ml-auto"
        />
      )}
      <SignHeading
        title={title}
        sub={subtitle}
        size="sm"
        className={cn(
          "min-w-0 flex-1",
          nav && "items-center text-center md:flex-none md:items-start md:text-left"
        )}
      />
      {nav && (
        <ArrowButton
          direction="next"
          disabled={nextDisabled}
          onClick={onNext}
          className="md:order-3"
        />
      )}
    </div>
  )
}

function ArrowButton({
  direction,
  disabled,
  onClick,
  className,
}: {
  direction: "prev" | "next"
  disabled?: boolean
  onClick?: () => void
  className?: string
}) {
  const Icon = direction === "prev" ? ArrowLeft : ArrowRight
  return (
    <button
      type="button"
      aria-label={direction === "prev" ? "Previous day" : "Next day"}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-[background-color,opacity] duration-[var(--duration-fast)] hover:bg-primary/85 active:bg-primary/75 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:pointer-events-none disabled:opacity-20",
        className
      )}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  )
}
