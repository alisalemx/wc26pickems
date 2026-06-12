import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Sticky day strip used in the Matches views. When `onPrev`/`onNext` are
 *  given it renders the arrow-nav variant (day-by-day browsing); otherwise a
 *  plain heading (section labels in the all-matches list). The `top-14` offset
 *  matches the h-14 app header so the strip sits flush beneath it. */
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

  return (
    <div className="sticky top-14 z-10 -mx-3 flex items-center gap-2 bg-background/90 px-3 py-1.5 backdrop-blur sm:-mx-4 sm:px-4">
      {nav && (
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous day"
          disabled={prevDisabled}
          onClick={onPrev}
        >
          <ChevronLeft />
        </Button>
      )}
      <div className={nav ? "flex-1 text-center" : "flex-1"}>
        <h2
          className={
            nav
              ? "text-sm font-semibold"
              : "text-sm font-semibold text-muted-foreground"
          }
        >
          {heading}
          {isToday && <span className="ml-2 text-primary">Today</span>}
        </h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {nav && (
        <Button
          variant="outline"
          size="icon"
          aria-label="Next day"
          disabled={nextDisabled}
          onClick={onNext}
        >
          <ChevronRight />
        </Button>
      )}
    </div>
  )
}
