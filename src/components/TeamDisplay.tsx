import { flagEmoji } from "@/lib/flags"
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
  /** Grey out + fade the team — used to de-emphasize the loser on a finished
   *  match card. The `grayscale` filter desaturates the emoji flag too. */
  dim?: boolean
  className?: string
}) {
  if (stack) {
    return (
      <div
        className={cn(
          "flex min-w-0 flex-col items-center gap-1.5 text-center",
          dim && "opacity-60 grayscale",
          className
        )}
      >
        <span
          className={cn(
            "text-4xl leading-none sm:text-5xl",
            dim && "opacity-75"
          )}
        >
          {flagEmoji(code)}
        </span>
        <span className="line-clamp-2 whitespace-normal text-sm font-medium leading-tight sm:text-base">
          {name ?? "TBD"}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2",
        align === "right" && "flex-row-reverse text-right",
        dim && "opacity-60 grayscale",
        className
      )}
    >
      <span
        className={cn(
          "leading-none",
          size === "md" ? "text-2xl" : "text-base",
          dim && "opacity-75"
        )}
      >
        {flagEmoji(code)}
      </span>
      <span className={cn("truncate", size === "md" ? "font-medium" : "text-sm")}>
        {name ?? "TBD"}
      </span>
    </div>
  )
}
