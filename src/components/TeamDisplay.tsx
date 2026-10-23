import { Flag } from "@/components/Flag"
import { cn } from "@/lib/utils"

/** Flag + team name, used wherever a team is listed (match cards, standings,
 *  admin rows). `size` controls the inline (non-`stack`) variant: `md` is the
 *  roomy match-card style, `sm` the denser list style. With `stack` the name
 *  sits *below* a large flag, centered, at every breakpoint — the match-card
 *  layout; the name wraps (instead of truncating) so long names like
 *  "Bosnia-Herzegovina" stay readable. `align="right"` only mirrors the inline
 *  variant (the stacked one is centered, so it needs no side). */
export function TeamDisplay({
  name,
  code,
  align = "left",
  size = "md",
  stack = false,
  dim = false,
  className,
}: {
  name: string | null
  code: string | null
  align?: "left" | "right"
  size?: "sm" | "md"
  stack?: boolean
  /** De-emphasize the loser on a finished match: the name drops to the quiet
   *  grey. The flag keeps its colours so the team stays recognisable. */
  dim?: boolean
  className?: string
}) {
  if (stack) {
    return (
      <div
        className={cn(
          "flex min-w-0 flex-col items-center gap-2 text-center",
          className
        )}
      >
        <Flag code={code} size="lg" className="sm:size-12" />
        <span
          className={cn(
            "line-clamp-2 text-[15px] leading-tight font-semibold tracking-tight whitespace-normal transition-colors sm:text-base",
            dim && "text-quiet",
            !name && "text-muted-foreground"
          )}
        >
          {name ?? "TBD"}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5",
        align === "right" && "flex-row-reverse text-right",
        className
      )}
    >
      <Flag code={code} size={size === "md" ? "md" : "sm"} />
      <span
        className={cn(
          "truncate",
          size === "md" ? "font-semibold tracking-tight" : "text-sm font-medium",
          dim && "text-quiet",
          !name && "text-muted-foreground"
        )}
      >
        {name ?? "TBD"}
      </span>
    </div>
  )
}
