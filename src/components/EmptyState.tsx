import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Centered muted message for "nothing here yet" states. Pass `className` to
 *  override the default vertical padding (e.g. tighter inside a card). */
export function EmptyState({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        "py-12 text-center text-sm text-muted-foreground",
        className
      )}
    >
      {children}
    </p>
  )
}
