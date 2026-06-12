import { useState } from "react"
import { ChevronDown, Lock, Check } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { StageBadge } from "./StageBadge"
import { ResultBadge } from "./ResultBadge"
import { TeamDisplay } from "./TeamDisplay"
import { ScorePair } from "./ScoreInput"
import { kickoffTime, isLocked } from "@/lib/format"
import { scorePrediction, maxPoints, EXACT_BASE } from "@/lib/scoring"
import { useRevealedPredictions, usePredictionDistribution } from "@/hooks/queries"
import type { MatchRow, PredictionRow } from "@/lib/types"
import { cn } from "@/lib/utils"

interface Props {
  match: MatchRow
  prediction?: PredictionRow
  ownUserId?: string
  onSave: (homePred: number, awayPred: number) => void
  saving?: boolean
}

export function MatchCard({
  match,
  prediction,
  ownUserId,
  onSave,
  saving,
}: Props) {
  const signedIn = ownUserId != null
  const locked = isLocked(match.kickoff)
  const finished = match.status === "FINISHED" && match.home_score != null
  const predictable =
    !locked && match.home_team != null && match.away_team != null
  // Anonymous visitors can see the match but can't enter or save a prediction.
  const canPredict = predictable && signedIn

  const [home, setHome] = useState(prediction ? String(prediction.home_pred) : "")
  const [away, setAway] = useState(prediction ? String(prediction.away_pred) : "")
  const [expanded, setExpanded] = useState(false)

  // The prediction arrives asynchronously (and can change after a save). Sync
  // the inputs during render when the stored value changes — React's
  // recommended alternative to a setState-in-effect.
  const predKey = prediction
    ? `${prediction.home_pred}-${prediction.away_pred}`
    : ""
  const [syncedKey, setSyncedKey] = useState(predKey)
  if (prediction && predKey !== syncedKey) {
    setSyncedKey(predKey)
    setHome(String(prediction.home_pred))
    setAway(String(prediction.away_pred))
  }

  const dirty =
    home !== "" &&
    away !== "" &&
    (!prediction ||
      Number(home) !== prediction.home_pred ||
      Number(away) !== prediction.away_pred)

  const own =
    finished && prediction
      ? scorePrediction(
          match.stage,
          prediction.home_pred,
          prediction.away_pred,
          match.home_score!,
          match.away_score!
        )
      : null

  // Whether the footer bar will actually hold anything — a status hint on the
  // left or a button on the right. When it won't (e.g. an anonymous visitor on
  // an upcoming group match, now that the "Worth up to 3 pts" line is gone),
  // skip the bar entirely so it doesn't render as empty padding.
  const hasFooter =
    (!predictable && !locked) ||
    (predictable && (prediction != null || maxPoints(match.stage) > EXACT_BASE)) ||
    (finished && own != null) ||
    (locked && !finished && prediction != null) ||
    canPredict ||
    (signedIn && locked)

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between px-4 pt-3 text-xs text-muted-foreground">
        <StageBadge stage={match.stage} group={match.group_name} />
        <span className={cn("flex items-center gap-1", finished && "text-primary")}>
          {locked ? (
            <>
              <Lock className="size-3" /> {finished ? "Ended" : "Locked"}
            </>
          ) : (
            kickoffTime(match.kickoff)
          )}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3">
        <TeamDisplay name={match.home_team} code={match.home_code} stack />
        {signedIn ? (
          // Signed in: the boxes hold (or capture) your prediction.
          <ScorePair
            home={home}
            away={away}
            onHome={setHome}
            onAway={setAway}
            homeLabel={`${match.home_team ?? "Home"} predicted goals`}
            awayLabel={`${match.away_team ?? "Away"} predicted goals`}
            disabled={!canPredict}
            muted={!canPredict}
          />
        ) : finished ? (
          // Visitor, match over: show the final score instead of empty inputs.
          <div className="flex flex-col items-center leading-none">
            <span className="text-2xl font-bold tabular-nums">
              {match.home_score} : {match.away_score}
            </span>
            {match.duration === "PENALTY_SHOOTOUT" &&
              match.home_pens != null && (
                <span className="mt-1 text-[10px] text-muted-foreground">
                  pens {match.home_pens}–{match.away_pens}
                </span>
              )}
          </div>
        ) : (
          // Visitor, upcoming match: nothing to show yet.
          <span className="px-3 text-sm font-medium text-muted-foreground">vs</span>
        )}
        <TeamDisplay name={match.away_team} code={match.away_code} align="right" stack />
      </div>

      {canPredict && (
        <PopularPicks
          matchId={match.id}
          selected={`${home}-${away}`}
          onPick={(h, a) => {
            setHome(String(h))
            setAway(String(a))
          }}
        />
      )}

      {signedIn && finished && (
        <div className="flex items-center justify-center gap-2 px-4 pb-1 text-sm">
          <span className="text-muted-foreground">Result</span>
          <span className="font-semibold tabular-nums">
            {match.home_score} : {match.away_score}
          </span>
          {match.duration === "PENALTY_SHOOTOUT" &&
            match.home_pens != null && (
              <span className="text-xs text-muted-foreground">
                (pens {match.home_pens}–{match.away_pens})
              </span>
            )}
        </div>
      )}

      {hasFooter && (
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-1">
        <div className="flex min-h-6 items-center text-sm text-muted-foreground">
          {!predictable && !locked && "Awaiting teams"}
          {predictable &&
            (prediction ? (
              <span className="flex items-center gap-1 text-primary">
                <Check className="size-3.5" /> Saved {prediction.home_pred}–
                {prediction.away_pred}
              </span>
            ) : maxPoints(match.stage) > EXACT_BASE ? (
              // Only flag the points on knockout cards, where the stage
              // multiplier bumps them above the base — otherwise every group
              // match repeats the same "Worth up to 3 pts".
              `Worth up to ${maxPoints(match.stage)} pts`
            ) : null)}
          {finished && own && (
            <ResultBadge result={own.result} points={own.points} />
          )}
          {locked && !finished && prediction && (
            <span>
              Your pick {prediction.home_pred}–{prediction.away_pred}
            </span>
          )}
        </div>

        {canPredict && (
          <Button
            size="sm"
            disabled={!dirty || saving}
            onClick={() => onSave(Number(home), Number(away))}
          >
            {prediction ? "Update" : "Save"}
          </Button>
        )}
        {signedIn && locked && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded((v) => !v)}
          >
            Picks
            <ChevronDown
              className={cn("size-4 transition-transform", expanded && "rotate-180")}
            />
          </Button>
        )}
      </div>
      )}

      {expanded && signedIn && locked && (
        <RevealedPicks match={match} ownUserId={ownUserId} />
      )}
    </Card>
  )
}

/** Quick-pick row of the crowd's most-predicted scorelines. Counts are
 *  anonymous aggregates (see `prediction_distributions`), so it's safe to show
 *  before kickoff; tapping a chip fills the score inputs. */
function PopularPicks({
  matchId,
  selected,
  onPick,
}: {
  matchId: number
  selected: string
  onPick: (home: number, away: number) => void
}) {
  const { data } = usePredictionDistribution(matchId, true)
  if (!data || data.length === 0) return null
  const total = data.reduce((sum, d) => sum + d.picks, 0)

  return (
    <div className="flex flex-col items-center gap-1.5 px-4 pb-3">
      <span className="text-xs text-muted-foreground">Popular picks</span>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {data.slice(0, 3).map((d) => {
          const key = `${d.home_pred}-${d.away_pred}`
          const active = key === selected
          return (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => onPick(d.home_pred, d.away_pred)}
              className="h-7 gap-1.5 px-2 text-xs"
            >
              <span className="font-semibold tabular-nums">
                {d.home_pred}–{d.away_pred}
              </span>
              <span
                className={cn(
                  "tabular-nums",
                  active ? "text-primary-foreground/80" : "text-muted-foreground"
                )}
              >
                {Math.round((d.picks / total) * 100)}%
              </span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function RevealedPicks({
  match,
  ownUserId,
}: {
  match: MatchRow
  ownUserId?: string
}) {
  const { data, isLoading } = useRevealedPredictions(match.id, true)
  const finished = match.status === "FINISHED" && match.home_score != null

  return (
    <div className="bg-muted/30 px-4 py-3">
      <Separator className="mb-3" />
      {isLoading && (
        <p className="text-xs text-muted-foreground">Loading picks…</p>
      )}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <p className="text-xs text-muted-foreground">No predictions.</p>
      )}
      <ul className="space-y-1.5">
        {data?.map((p) => {
          const scored = finished
            ? scorePrediction(
                match.stage,
                p.home_pred,
                p.away_pred,
                match.home_score!,
                match.away_score!
              )
            : null
          return (
            <li
              key={p.user_id}
              className="flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2">
                <span className="truncate">@{p.username}</span>
                {p.user_id === ownUserId && (
                  <Badge variant="outline" className="px-1 py-0 text-[10px]">
                    you
                  </Badge>
                )}
              </span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums font-medium">
                  {p.home_pred}–{p.away_pred}
                </span>
                {scored && (
                  <ResultBadge result={scored.result} points={scored.points} />
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
