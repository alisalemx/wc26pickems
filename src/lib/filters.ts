import type { ResultType } from "@/lib/types"

/** The settled-pick filters shared by /me and the player pages: "all" plus
 *  the three ResultType buckets scorePrediction can return. */
export type ResultFilter = "all" | ResultType
export const RESULT_FILTERS: { value: ResultFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "OUTCOME", label: "Outcome" },
  { value: "EXACT", label: "Exact" },
  { value: "MISS", label: "Miss" },
]
