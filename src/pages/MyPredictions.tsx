import { useMemo, useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useLeaderboard, useMatches, useMyPredictions } from "@/hooks/queries"
import { EmptyState } from "@/components/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { SignHeading } from "@/components/SignHeading"
import { PickRow, RankSummary, SettledList } from "@/components/PlayerSummary"
import { RESULT_FILTERS, type ResultFilter } from "@/lib/filters"
import { resolveKnockoutTeams, tournamentChampion } from "@/lib/bracket"
import { competitionRanks } from "@/lib/rank"
import { remainingMaxPoints, scorePrediction } from "@/lib/scoring"
import { SegmentedControl } from "@/components/SegmentedControl"

export function MyPredictions() {
  const { session, profile } = useAuth()
  const userId = session?.user.id
  const { data: rawMatches, isLoading } = useMatches()
  // Fill knockout TBD slots from feeders client-side (same as the match list)
  // so the team names stay consistent with the Matches tab.
  const matches = useMemo(
    () => (rawMatches ? resolveKnockoutTeams(rawMatches) : rawMatches),
    [rawMatches]
  )
  const { data: predictions } = useMyPredictions(userId)
  const { data: leaderboard } = useLeaderboard()

  // Position in the shared leaderboard query, using the same standard
  // competition ranking (shared position on a full tie) as the Leaderboard
  // page. Hidden until scoring has actually started (top score > 0), since
  // before any match is settled everyone is tied at zero and a rank would
  // just reflect arbitrary profile order.
  const rank = useMemo(() => {
    if (!leaderboard || !userId) return null
    if ((leaderboard[0]?.total_points ?? 0) === 0) return null
    const idx = leaderboard.findIndex((r) => r.user_id === userId)
    if (idx === -1) return null
    const ranks = competitionRanks(leaderboard)
    return { position: ranks[idx], total: leaderboard.length }
  }, [leaderboard, userId])

  const stats = useMemo(() => {
    if (!matches || !predictions)
      return { made: 0, left: 0, points: 0, exact: 0, finished: 0 }
    let made = 0
    let left = 0
    let points = 0
    let exact = 0
    let finished = 0
    for (const m of matches) {
      const isFinished =
        m.status === "FINISHED" && m.home_score != null && m.away_score != null
      // "Matches left" = every fixture in the tournament not yet played to a
      // final result (upcoming or in progress), regardless of who's predicted it.
      if (!isFinished) left++
      const p = predictions[m.id]
      if (!p) continue
      made++
      if (isFinished) {
        finished++
        const s = scorePrediction(
          m.stage,
          p.home_pred,
          p.away_pred,
          m.home_score!,
          m.away_score!
        )
        points += s.points
        if (s.result === "EXACT") exact++
      }
    }
    return { made, left, points, exact, finished }
  }, [matches, predictions])

  const remainingPoints = useMemo(
    () => remainingMaxPoints(matches ?? []),
    [matches]
  )

  const champion = useMemo(
    () => tournamentChampion(matches ?? []),
    [matches]
  )

  const [filter, setFilter] = useState<ResultFilter>("all")

  const finishedWithPicks = useMemo(() => {
    if (!matches || !predictions) return []
    return matches
      .filter(
        (m) =>
          m.status === "FINISHED" &&
          m.home_score != null &&
          m.away_score != null &&
          predictions[m.id]
      )
      .sort((a, b) => +new Date(b.kickoff) - +new Date(a.kickoff))
      .map((m) => {
        const p = predictions[m.id]
        const scored = scorePrediction(
          m.stage,
          p.home_pred,
          p.away_pred,
          m.home_score!,
          m.away_score!
        )
        return { m, p, scored }
      })
  }, [matches, predictions])

  // Counts per bucket for the filter labels (computed once, not per-render).
  const counts = useMemo(() => {
    const c = { all: finishedWithPicks.length, EXACT: 0, OUTCOME: 0, MISS: 0 }
    for (const { scored } of finishedWithPicks) c[scored.result]++
    return c
  }, [finishedWithPicks])

  const filtered = useMemo(
    () =>
      filter === "all"
        ? finishedWithPicks
        : finishedWithPicks.filter(({ scored }) => scored.result === filter),
    [finishedWithPicks, filter]
  )

  // The viewer's boldest correct call: the EXACT pick worth the most points
  // (tie broken by latest kickoff — finishedWithPicks is already sorted
  // newest-first, so a strict `>` keeps the first, latest-kickoff match on a
  // points tie).
  const bestCall = useMemo(() => {
    let best: (typeof finishedWithPicks)[number] | undefined
    for (const item of finishedWithPicks) {
      if (item.scored.result !== "EXACT") continue
      if (!best || item.scored.points > best.scored.points) best = item
    }
    return best
  }, [finishedWithPicks])

  const filterControl = finishedWithPicks.length > 0 && (
    <SegmentedControl
      layoutId="me-filter-active"
      value={filter}
      onChange={setFilter}
      options={RESULT_FILTERS.map((f) => ({
        value: f.value,
        label: (
          <>
            {f.label}
            <span className="ml-1 text-[11px] tabular-nums opacity-60 max-[359px]:hidden sm:ml-1.5 sm:text-xs">
              {counts[f.value]}
            </span>
          </>
        ),
      }))}
    />
  )

  return (
    <div className="flex flex-col gap-4">
      <SignHeading
        as="h1"
        size="lg"
        title="Your picks"
        sub={profile ? `@${profile.username}` : undefined}
        className="px-1 sm:px-0"
      />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[24rem_minmax(0,1fr)]">
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : (
          <RankSummary
            rank={rank}
            className="lg:sticky lg:top-20"
            stats={[
              { label: "Total points", value: stats.points },
              { label: "Exact scores", value: stats.exact },
              { label: "Picks made", value: stats.made },
            ]}
            footer={
              champion ? (
                <>
                  <p className="font-semibold text-foreground">
                    Tournament complete
                  </p>
                  {bestCall && (
                    <p className="mt-0.5">
                      Best call: {bestCall.m.home_team} {bestCall.m.home_score}–
                      {bestCall.m.away_score} {bestCall.m.away_team}, +
                      {bestCall.scored.points} pts
                    </p>
                  )}
                </>
              ) : stats.left > 0 ? (
                <p>
                  {stats.left} {stats.left === 1 ? "match" : "matches"} left in
                  the tournament, up to {remainingPoints}{" "}
                  {remainingPoints === 1 ? "pt" : "pts"} still up for grabs.
                </p>
              ) : null
            }
          />
        )}

        <SettledList
          title="Settled matches"
          filter={filterControl}
          empty={
            finishedWithPicks.length === 0 ? (
              <EmptyState className="py-8">
                No results scored yet. Check back after kickoff.
              </EmptyState>
            ) : filtered.length === 0 ? (
              <EmptyState className="py-8">
                No{" "}
                {RESULT_FILTERS.find((f) => f.value === filter)?.label.toLowerCase()}{" "}
                results yet.
              </EmptyState>
            ) : undefined
          }
        >
          {filtered.map(({ m, p, scored: s }, i) => (
            <PickRow
              key={m.id}
              match={m}
              homePred={p.home_pred}
              awayPred={p.away_pred}
              result={s.result}
              points={s.points}
              index={i}
            />
          ))}
        </SettledList>
      </div>
    </div>
  )
}
