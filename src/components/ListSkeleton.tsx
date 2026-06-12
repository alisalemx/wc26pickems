import { Skeleton } from "@/components/ui/skeleton"

/** Renders `count` skeleton placeholders. `className` styles the wrapper
 *  (spacing or grid layout), `itemClassName` sizes each placeholder. */
export function ListSkeleton({
  count,
  className = "space-y-3",
  itemClassName,
}: {
  count: number
  className?: string
  itemClassName: string
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={itemClassName} />
      ))}
    </div>
  )
}
