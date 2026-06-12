import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import {
  useMatches,
  useMyPredictions,
  useUpsertPrediction,
} from "@/hooks/queries"
import { MatchCard } from "@/components/MatchCard"
import { Button } from "@/components/ui/button"
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
        saving={upsert.isPending}
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

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {!isLoading && days.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No matches yet. Seed the schedule to get started.
        </p>
      )}

      {/* Day-by-day view */}
      {!isLoading && view === "day" && current && (
        <div className="space-y-3">
          <div className="sticky top-[57px] z-10 -mx-3 flex items-center gap-2 bg-background/90 px-3 py-1.5 backdrop-blur sm:-mx-4 sm:px-4">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous day"
              disabled={dayIndex <= 0}
              onClick={() => setSelectedDay(days[dayIndex - 1][0])}
            >
              <ChevronLeft />
            </Button>
            <div className="flex-1 text-center">
              <h2 className="text-sm font-semibold">
                {dayHeading(current[1][0].kickoff)}
                {current[0] === todayKey && (
                  <span className="ml-2 text-primary">Today</span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground">
                {current[1].length} match{current[1].length === 1 ? "" : "es"}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next day"
              disabled={dayIndex >= days.length - 1}
              onClick={() => setSelectedDay(days[dayIndex + 1][0])}
            >
              <ChevronRight />
            </Button>
          </div>
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
            <p className="py-12 text-center text-sm text-muted-foreground">
              No matches in this stage.
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
              {dayMatches.map(renderCard)}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
