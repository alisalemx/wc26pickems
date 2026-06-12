import { flagEmoji } from "@/lib/flags"
import { cn } from "@/lib/utils"

/** Flag + team name, used wherever a team is listed (match cards, standings,
 *  admin rows). `md` is the roomy match-card style; `sm` is the denser list
 *  style. `align="right"` mirrors the layout for the away side. With `stack`,
 *  the name drops *below* the flag on narrow screens (`< sm`) so it gets the
 *  full column width and can wrap instead of truncating; the horizontal layout
 *  is restored at `sm` and up. */
export function TeamDisplay({
  name,
  code,
  align = "left",
  size = "md",
  stack = false,
  className,
}: {
  name: string | null
  code: string | null
  align?: "left" | "right"
  size?: "sm" | "md"
  stack?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2",
        align === "right" && "flex-row-reverse text-right",
        stack && "max-sm:flex-col max-sm:gap-1 max-sm:text-center",
        className
      )}
    >
      <span className={cn("leading-none", size === "md" ? "text-2xl" : "text-base")}>
        {flagEmoji(code)}
      </span>
      <span
        className={cn(
          "truncate",
          size === "md" ? "font-medium" : "text-sm",
          stack &&
            "max-sm:line-clamp-2 max-sm:whitespace-normal max-sm:text-xs max-sm:leading-tight"
        )}
      >
        {name ?? "TBD"}
      </span>
    </div>
  )
}
