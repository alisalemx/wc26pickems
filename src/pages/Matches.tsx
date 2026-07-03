import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import {
  useMatches,
  useMyPredictions,
  useUpsertPrediction,
} from "@/hooks/queries"
import { ChampionBanner } from "@/components/ChampionBanner"
import { LeagueAwards } from "@/components/LeagueAwards"
import { MatchCard } from "@/components/MatchCard"
import { PenaltyNote } from "@/components/PenaltyNote"
import { PredictReminder } from "@/components/PredictReminder"
import { DayHeader } from "@/components/DayHeader"
import { EmptyState } from "@/components/EmptyState"
import { ListSkeleton } from "@/components/ListSkeleton"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { dayHeading, dayKey, isLocked } from "@/lib/format"
import { resolveKnockoutTeams } from "@/lib/bracket"
import type { MatchRow, MatchStage } from "@/lib/types"

const FILTERS: { value: string; label: string; stages: MatchStage[] }[] = [
  { value: "ALL", label: "All", stages: [] },
  { value: "GROUP", label: "Groups", stages: ["GROUP"] },
  { value: "R32", label: "R32", stages: ["R32"] },
  { value: "R16", label: "R16", stages: ["R16"] },
  { value: "QF", label: "QF", stages: ["QF"] },
  { value: "SF", label: "SF", stages: ["SF"] },
  { value: "FINAL", label: "Final", stages: ["THIRD", "FINAL"] },
]

/** Each match stage → the FILTERS tab that surfaces it. THIRD and FINAL both live
 *  under the "Final" tab. */
const STAGE_TO_FILTER: Record<MatchStage, string> = {
  GROUP: "GROUP",
  R32: "R32",
  R16: "R16",
  QF: "QF",
  SF: "SF",
  THIRD: "FINAL",
  FINAL: "FINAL",
}

/** Filter tab for the stage the tournament is currently in: the stage of the
 *  earliest match not yet finished — i.e. the one being played or up next.
 *  Defaults to "ALL" before any fixtures load and to the last stage ("Final")
 *  once every match is done. */
function currentStageFilter(matches: MatchRow[] | undefined): string {
  if (!matches || matches.length === 0) return "ALL"
  let next: MatchRow | null = null
  for (const m of matches) {
    if (m.status === "FINISHED" || m.status === "CANCELLED") continue
    if (!next || m.kickoff < next.kickoff) next = m
  }
  return STAGE_TO_FILTER[next?.stage ?? "FINAL"]
}

type View = "day" | "all"

/** Centered category label with hairline rules either side — used inside a day
 *  to mark where the not-yet-played matches start. */
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

export function Matches() {
  const { session } = useAuth()
  const userId = session?.user.id
  const { data: rawMatches, isLoading } = useMatches()
  // Fill knockout fixtures' TBD slots from their feeders' winners, client-side —
  // the same derivation the Bracket tab uses — so a R16+ card shows its teams
  // the moment the feeding matches finish, rather than waiting for football-data
  // to assign the slot upstream (which lags). Display-only: a stored assignment
  // always wins, so this only fills slots still null in our table.
  const matches = useMemo(
    () => (rawMatches ? resolveKnockoutTeams(rawMatches) : rawMatches),
    [rawMatches]
  )
  const { data: predictions } = useMyPredictions(userId)
  const upsert = useUpsertPrediction(userId)
  const [view, setView] = useState<View>("day")
  // The stage filter defaults to whatever stage the tournament is currently in,
  // but a user's explicit pick (`chosenFilter`) wins. Derived rather than stored
  // so the default tracks the live matches query without an effect (same pattern
  // as the Tournament tabs).
  const [chosenFilter, setChosenFilter] = useState<string | null>(null)
  const stageFilter = useMemo(() => currentStageFilter(matches), [matches])
  const filter = chosenFilter ?? stageFilter

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

  // Switching days should bring the day strip up flush beneath the app header,
  // rather than retaining the previous scroll position. The DayHeader sticks at
  // top-14 (the h-14 app header), so scroll the day-view top to that offset.
  // Only do this when the day strip is already pinned (the user has scrolled
  // past the segmented controls); if they're still at the top with the controls
  // visible, leave the scroll position alone.
  const dayViewRef = useRef<HTMLDivElement>(null)
  function goToDay(key: string) {
    setSelectedDay(key)
    const el = dayViewRef.current
    if (!el) return
    const HEADER_OFFSET = 56 // h-14 app header
    const rect = el.getBoundingClientRect()
    // The day header is pinned once the day view has scrolled up to the offset.
    if (rect.top > HEADER_OFFSET) return
    const top = window.scrollY + rect.top - HEADER_OFFSET
    window.scrollTo({ top: Math.max(0, top) })
  }

  // Jump-and-highlight for the reminder banner's "Predict next" CTA: switch
  // the view to where the target match lives (its day, or its stage tab), then
  // flash a one-shot gold ring on its card. The effect runs after commit, so
  // the target card exists by the time we scroll to it even when the day or
  // filter just changed.
  const [highlightId, setHighlightId] = useState<number | null>(null)
  function goToMatch(m: MatchRow) {
    if (view === "day") setSelectedDay(dayKey(m.kickoff))
    else setChosenFilter(STAGE_TO_FILTER[m.stage])
    setHighlightId(m.id)
  }
  useEffect(() => {
    if (highlightId == null) return
    const el = document.getElementById(`match-${highlightId}`)
    if (el) {
      // Not scrollIntoView: on iOS Safari a programmatic scrollIntoView can
      // shift the visual viewport and leave the fixed bottom nav floating
      // mid-page. window.scrollTo scrolls the layout viewport, which fixed
      // elements track, matching goToDay's approach above.
      const HEADER_OFFSET = 56 // h-14 app header
      const NAV_OFFSET = 64 // approx height of the fixed bottom tab bar
      const rect = el.getBoundingClientRect()
      const visibleHeight = window.innerHeight - HEADER_OFFSET - NAV_OFFSET
      const top =
        window.scrollY +
        rect.top -
        HEADER_OFFSET -
        (visibleHeight - rect.height) / 2
      window.scrollTo({ top: Math.max(0, top) })
    }
    const t = setTimeout(() => setHighlightId(null), 2000)
    return () => clearTimeout(t)
  }, [highlightId])

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

  function renderCard(m: MatchRow, index: number) {
    return (
      <MatchCard
        key={m.id}
        match={m}
        index={index}
        prediction={predictions?.[m.id]}
        ownUserId={userId}
        highlighted={m.id === highlightId}
        saving={upsert.isPending && upsert.variables?.matchId === m.id}
        onSave={(h, a) => handleSave(m.id, h, a)}
      />
    )
  }

  // Within a day, order matches ended → locked (kicked off, no result yet) →
  // upcoming. Ended and locked sit unlabeled under the day header; a single
  // centered "Upcoming" divider marks where the not-yet-played ones begin —
  // shown only when something precedes them, so a fully-upcoming day stays
  // clean (the day header already labels it).
  function renderDayMatches(list: MatchRow[]) {
    const isEnded = (m: MatchRow) =>
      m.status === "FINISHED" && m.home_score != null
    const ended = list.filter(isEnded)
    const locked = list.filter((m) => !isEnded(m) && isLocked(m.kickoff))
    const upcoming = list.filter((m) => !isEnded(m) && !isLocked(m.kickoff))
    const played = [...ended, ...locked]
    let i = 0
    return (
      <>
        {played.map((m) => renderCard(m, i++))}
        {played.length > 0 && upcoming.length > 0 && (
          <SectionDivider label="Upcoming" />
        )}
        {upcoming.map((m) => renderCard(m, i++))}
      </>
    )
  }

  return (
    <div className="space-y-4">
      <ChampionBanner matches={matches} />
      <LeagueAwards matches={matches} centerTitle />
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
        // min-height keeps the day view at least one viewport tall so a short
        // day (e.g. knockout cards with undecided teams) still has room to
        // scroll its header flush under the app header. Without it, switching
        // to a short day shrinks the document and the browser clamps the
        // scroll back to the top.
        <div
          ref={dayViewRef}
          className="min-h-[calc(100dvh-3.5rem)] space-y-3"
        >
          <DayHeader
            heading={dayHeading(current[1][0].kickoff)}
            isToday={current[0] === todayKey}
            subtitle={`${current[1].length} match${current[1].length === 1 ? "" : "es"}`}
            onPrev={() => goToDay(days[dayIndex - 1][0])}
            onNext={() => goToDay(days[dayIndex + 1][0])}
            prevDisabled={dayIndex <= 0}
            nextDisabled={dayIndex >= days.length - 1}
          />
          {current[0] !== todayKey && days.some(([k]) => k >= todayKey) && (
            <div className="text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  goToDay(days.find(([k]) => k >= todayKey)![0])
                }
              >
                Jump to today
              </Button>
            </div>
          )}
          <PredictReminder
            matches={matches}
            predictions={predictions}
            signedIn={Boolean(userId)}
            onGoToNext={goToMatch}
          />
          <PenaltyNote />
          {renderDayMatches(current[1])}
        </div>
      )}

      {/* All-matches view */}
      {!isLoading && view === "all" && days.length > 0 && (
        <div className="space-y-4">
          <Tabs value={filter} onValueChange={setChosenFilter}>
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

          <PredictReminder
            matches={matches}
            predictions={predictions}
            signedIn={Boolean(userId)}
            onGoToNext={goToMatch}
          />

          <PenaltyNote />

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
              {renderDayMatches(dayMatches)}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
