import { useMemo } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useMatches, useMyPredictions } from "@/hooks/queries"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ResultBadge } from "@/components/ResultBadge"
import { StageBadge } from "@/components/StageBadge"
import { Skeleton } from "@/components/ui/skeleton"
import { flagEmoji } from "@/lib/flags"
import { isLocked } from "@/lib/format"
import { scorePrediction } from "@/lib/scoring"

export function MyPredictions() {
  const { session, profile } = useAuth()
  const userId = session?.user.id
  const { data: matches, isLoading } = useMatches()
  const { data: predictions } = useMyPredictions(userId)

  const stats = useMemo(() => {
    if (!matches || !predictions)
      return { made: 0, predictable: 0, points: 0, exact: 0, finished: 0 }
    let made = 0
    let predictable = 0
    let points = 0
    let exact = 0
    let finished = 0
    for (const m of matches) {
      const teamsKnown = m.home_team != null && m.away_team != null
      if (teamsKnown && !isLocked(m.kickoff)) predictable++
      const p = predictions[m.id]
      if (!p) continue
      made++
      if (m.status === "FINISHED" && m.home_score != null) {
        finished++
        const s = scorePrediction(
          m.stage,
          p.home_pred,
          p.away_pred,
          m.home_score,
          m.away_score!
        )
        points += s.points
        if (s.result === "EXACT") exact++
      }
    }
    return { made, predictable, points, exact, finished }
  }, [matches, predictions])

  const finishedWithPicks = useMemo(() => {
    if (!matches || !predictions) return []
    return matches
      .filter(
        (m) =>
          m.status === "FINISHED" &&
          m.home_score != null &&
          predictions[m.id]
      )
      .sort((a, b) => +new Date(b.kickoff) - +new Date(a.kickoff))
  }, [matches, predictions])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{profile ? `@${profile.username}` : "My"} predictions</CardTitle>
          <CardDescription>Your tournament at a glance.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat label="Total points" value={stats.points} highlight />
              <Stat label="Exact scores" value={stats.exact} />
              <Stat label="Picks made" value={stats.made} />
            </div>
          )}
          {stats.predictable > 0 && (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              {stats.predictable} open{" "}
              {stats.predictable === 1 ? "match" : "matches"} still to predict.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Settled matches</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {finishedWithPicks.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No results scored yet. Check back after kickoff!
            </p>
          )}
          {finishedWithPicks.map((m) => {
            const p = predictions![m.id]
            const s = scorePrediction(
              m.stage,
              p.home_pred,
              p.away_pred,
              m.home_score!,
              m.away_score!
            )
            return (
              <div
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <StageBadge
                    stage={m.stage}
                    group={m.group_name}
                    className="w-fit"
                  />
                  <span className="truncate">
                    {flagEmoji(m.home_code)} {m.home_team} {m.home_score}–
                    {m.away_score} {m.away_team} {flagEmoji(m.away_code)}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="secondary" className="tabular-nums">
                    pick {p.home_pred}–{p.away_pred}
                  </Badge>
                  <ResultBadge result={s.result} points={s.points} />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div className="rounded-lg border p-3">
      <div
        className={
          highlight
            ? "text-2xl font-bold text-primary"
            : "text-2xl font-bold"
        }
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
