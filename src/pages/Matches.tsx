import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import {
  useMatches,
  useMyPredictions,
  useUpsertPrediction,
} from "@/hooks/queries"
import { MatchCard } from "@/components/MatchCard"
import { DayHeader } from "@/components/DayHeader"
import { EmptyState } from "@/components/EmptyState"
import { ListSkeleton } from "@/components/ListSkeleton"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

type View = "day" | "all"

export function Matches() {
  const { session } = useAuth()
  const userId = session?.user.id
  const { data: matches, isLoading } = useMatches()
  const { data: predictions } = useMyPredictions(userId)
  const upsert = useUpsertPrediction(userId)
  const [view, setView] = useState<View>("day")
  const [filter, setFilter] = useState("ALL")

  const todayKey = dayKey(new Date().toISOString())

  // Sorted list of calendar days that have matches, plus each day's matches.
  const days = useMemo(() => {
    const byDay = new Map<string, MatchRow[]>()
    for (const m of matches ?? []) {
      const key = dayKey(m.kickoff)
      if (!byDay.has(key)) byDay.set(key, [])
      byDay.get(key)!.push(m)
    }
    return [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [matches])

  // Day-view selection: default to today, else the next upcoming match day.
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const defaultDay =
    days.find(([key]) => key >= todayKey)?.[0] ?? days[days.length - 1]?.[0]
  const dayIndex = days.findIndex(
    ([key]) => key === (selectedDay ?? defaultDay)
  )
  const current = dayIndex >= 0 ? days[dayIndex] : null

  // Grouped list for the "all" view, with the stage filter applied.
  const grouped = useMemo(() => {
    const active = FILTERS.find((f) => f.value === filter)!
    if (active.stages.length === 0) return days
    return days
      .map(
        ([key, list]) =>
          [key, list.filter((m) => active.stages.includes(m.stage))] as const
      )
      .filter(([, list]) => list.length > 0)
  }, [days, filter])

  function handleSave(matchId: number, h: number, a: number) {
    const match = matches?.find((m) => m.id === matchId)
    upsert.mutate(
      { matchId, homePred: h, awayPred: a },
      {
        onSuccess: () =>
          toast.success("Prediction saved", {
            description: match
              ? `${match.home_team ?? "Home"} ${h}–${a} ${match.away_team ?? "Away"}`
              : `${h}–${a}`,
          }),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not save (match locked?)"
          ),
      }
    )
  }

  function renderCard(m: MatchRow) {
    return (
      <MatchCard
        key={m.id}
        match={m}
        prediction={predictions?.[m.id]}
        ownUserId={userId}
        saving={upsert.isPending && upsert.variables?.matchId === m.id}
        onSave={(h, a) => handleSave(m.id, h, a)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <Tabs value={view} onValueChange={(v) => setView(v as View)}>
        <TabsList className="flex w-full">
          <TabsTrigger value="day" className="flex-1">
            By day
          </TabsTrigger>
          <TabsTrigger value="all" className="flex-1">
            All matches
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && <ListSkeleton count={4} itemClassName="h-28 w-full" />}

      {!isLoading && days.length === 0 && (
        <EmptyState>No matches yet. Seed the schedule to get started.</EmptyState>
      )}

      {/* Day-by-day view */}
      {!isLoading && view === "day" && current && (
        <div className="space-y-3">
          <DayHeader
            heading={dayHeading(current[1][0].kickoff)}
            isToday={current[0] === todayKey}
            subtitle={`${current[1].length} match${current[1].length === 1 ? "" : "es"}`}
            onPrev={() => setSelectedDay(days[dayIndex - 1][0])}
            onNext={() => setSelectedDay(days[dayIndex + 1][0])}
            prevDisabled={dayIndex <= 0}
            nextDisabled={dayIndex >= days.length - 1}
          />
          {current[0] !== todayKey && days.some(([k]) => k >= todayKey) && (
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSelectedDay(days.find(([k]) => k >= todayKey)![0])
                }
              >
                Jump to today
              </Button>
            </div>
          )}
          {current[1].map(renderCard)}
        </div>
      )}

      {/* All-matches view */}
      {!isLoading && view === "all" && days.length > 0 && (
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

          {grouped.length === 0 && (
            <EmptyState>No matches in this stage.</EmptyState>
          )}

          {grouped.map(([day, dayMatches]) => (
            <section
              key={day}
              id={day === todayKey ? "today" : undefined}
              className="space-y-3"
            >
              <DayHeader
                heading={dayHeading(dayMatches[0].kickoff)}
                isToday={day === todayKey}
              />
              {dayMatches.map(renderCard)}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
