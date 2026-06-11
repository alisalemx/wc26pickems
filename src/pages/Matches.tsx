import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import {
  useMatches,
  useMyPredictions,
  useUpsertPrediction,
} from "@/hooks/queries"
import { MatchCard } from "@/components/MatchCard"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { dayHeading, dayKey } from "@/lib/format"
import type { MatchRow, MatchStage } from "@/lib/types"

const FILTERS: { value: string; label: string; stages: MatchStage[] }[] = [
  { value: "ALL", label: "All", stages: [] },
  { value: "GROUP", label: "Groups", stages: ["GROUP"] },
  { value: "R32", label: "R32", stages: ["R32"] },
  { value: "R16", label: "R16", stages: ["R16"] },
  { value: "QF", label: "QF", stages: ["QF"] },
  { value: "SF", label: "SF", stages: ["SF"] },
  { value: "FINAL", label: "Final", stages: ["SF", "THIRD", "FINAL"] },
]

export function Matches() {
  const { session } = useAuth()
  const userId = session?.user.id
  const { data: matches, isLoading } = useMatches()
  const { data: predictions } = useMyPredictions(userId)
  const upsert = useUpsertPrediction(userId)
  const [filter, setFilter] = useState("ALL")

  const grouped = useMemo(() => {
    if (!matches) return []
    const active = FILTERS.find((f) => f.value === filter)!
    const list =
      active.stages.length === 0
        ? matches
        : matches.filter((m) => active.stages.includes(m.stage))
    const byDay = new Map<string, MatchRow[]>()
    for (const m of list) {
      const key = dayKey(m.kickoff)
      if (!byDay.has(key)) byDay.set(key, [])
      byDay.get(key)!.push(m)
    }
    return [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [matches, filter])

  const todayKey = dayKey(new Date().toISOString())

  function handleSave(matchId: number, h: number, a: number) {
    upsert.mutate(
      { matchId, homePred: h, awayPred: a },
      {
        onSuccess: () => toast.success("Prediction saved"),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not save (match locked?)"
          ),
      }
    )
  }

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="flex w-full">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value} className="flex-1">
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {!isLoading && grouped.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No matches yet. Seed the schedule to get started.
        </p>
      )}

      {grouped.map(([day, dayMatches]) => (
        <section
          key={day}
          id={day === todayKey ? "today" : undefined}
          className="space-y-3"
        >
          <div className="sticky top-[57px] z-10 -mx-3 bg-background/90 px-3 py-1.5 backdrop-blur sm:-mx-4 sm:px-4">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {dayHeading(dayMatches[0].kickoff)}
              {day === todayKey && (
                <span className="ml-2 text-primary">Today</span>
              )}
            </h2>
          </div>
          {dayMatches.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              prediction={predictions?.[m.id]}
              ownUserId={userId}
              saving={upsert.isPending}
              onSave={(h, a) => handleSave(m.id, h, a)}
            />
          ))}
        </section>
      ))}
    </div>
  )
}
