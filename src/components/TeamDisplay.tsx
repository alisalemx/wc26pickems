import { flagEmoji } from "@/lib/flags"
import { cn } from "@/lib/utils"

/** Flag + team name, used wherever a team is listed (match cards, standings,
 *  admin rows). `md` is the roomy match-card style; `sm` is the denser list
 *  style. `align="right"` mirrors the layout for the away side. */
export function TeamDisplay({
  name,
  code,
  align = "left",
  size = "md",
  className,
}: {
  name: string | null
  code: string | null
  align?: "left" | "right"
  size?: "sm" | "md"
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2",
        align === "right" && "flex-row-reverse text-right",
        className
      )}
    >
      <span className={cn("leading-none", size === "md" ? "text-2xl" : "text-base")}>
        {flagEmoji(code)}
      </span>
      <span className={cn("truncate", size === "md" ? "font-medium" : "text-sm")}>
        {name ?? "TBD"}
      </span>
    </div>
  )
}
