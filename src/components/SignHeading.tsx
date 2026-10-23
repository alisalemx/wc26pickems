import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const SIZE = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-3xl sm:text-4xl",
  xl: "text-5xl sm:text-6xl",
} as const

/** The Signage two-tone heading: two lines at the same size and weight, the
 *  first in ink and the second in the quiet grey, like a transit sign's name
 *  and destination. `sub` is the second line; leave it out for a one-line
 *  heading at the same scale. The grey is tuned for large text, so keep `sm`
 *  for short headings that still read as headings. */
export function SignHeading({
  title,
  sub,
  size = "md",
  as: Tag = "h2",
  className,
  subClassName,
}: {
  title: ReactNode
  sub?: ReactNode
  size?: keyof typeof SIZE
  as?: "h1" | "h2" | "h3" | "p"
  className?: string
  /** Override the second line's colour, e.g. on the green hero where the
   *  default grey would lose contrast. */
  subClassName?: string
}) {
  return (
    <Tag
      className={cn(
        "flex flex-col font-bold leading-[1.02] tracking-tight",
        size === "xl" && "tracking-display",
        SIZE[size],
        className
      )}
    >
      <span>{title}</span>
      {sub != null && (
        <span className={cn("text-quiet", subClassName)}>{sub}</span>
      )}
    </Tag>
  )
}
