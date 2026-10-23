import { flagUrl } from "@/lib/flags"
import { cn } from "@/lib/utils"

const SIZE = {
  xs: "size-4",
  sm: "size-5",
  md: "size-7",
  lg: "size-10",
  xl: "size-14",
  "2xl": "size-20",
} as const

/** A team's flag as a round badge, the signage "line bullet" shape. Rendered
 *  from SVG (not emoji, which Windows shows as two letters). A faint inset ring
 *  keeps pale flags like Japan's from dissolving into a white card. An
 *  undecided team gets an empty grey disc of the same size, so a slot that
 *  fills in later doesn't shift the layout. Decorative: the team name always
 *  sits beside it, so the image carries no alt text. */
export function Flag({
  code,
  size = "md",
  className,
}: {
  code: string | null | undefined
  size?: keyof typeof SIZE
  className?: string
}) {
  const url = flagUrl(code)
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-block shrink-0 overflow-hidden rounded-full bg-muted select-none",
        "after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:ring-1 after:ring-inset after:ring-black/10 dark:after:ring-white/15",
        SIZE[size],
        className
      )}
    >
      {url && (
        <img
          src={url}
          alt=""
          width={80}
          height={80}
          draggable={false}
          className="size-full object-cover"
        />
      )}
    </span>
  )
}
