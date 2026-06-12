import { useState } from "react"
import { ChevronDown, Lock, Check } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { StageBadge } from "./StageBadge"
import { ResultBadge } from "./ResultBadge"
import { TeamDisplay } from "./TeamDisplay"
import { kickoffTime, isLocked } from "@/lib/format"
import { scorePrediction, maxPoints } from "@/lib/scoring"
import { useRevealedPredictions } from "@/hooks/queries"
import type { MatchRow, PredictionRow } from "@/lib/types"
import { cn } from "@/lib/utils"

interface Props {
  match: MatchRow
  prediction?: PredictionRow
  ownUserId?: string
  onSave: (homePred: number, awayPred: number) => void
  saving?: boolean
}

/** Score inputs are filled with a muted background once locked, so a past
 *  match reads clearly as disabled rather than just dimmed. */
function scoreInputClass(predictable: boolean): string {
  return cn(
    "h-14 w-16 text-center text-2xl font-bold tabular-nums md:text-2xl",
    !predictable && "bg-muted text-muted-foreground disabled:opacity-100"
  )
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

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between px-4 pt-3 text-xs text-muted-foreground">
        <StageBadge stage={match.stage} group={match.group_name} />
        <span className="flex items-center gap-1">
          {locked ? (
            <>
              <Lock className="size-3" /> {finished ? "Full time" : "Locked"}
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
          <div className="flex items-center gap-1.5">
            <Input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              aria-label={`${match.home_team ?? "Home"} predicted goals`}
              value={home}
              disabled={!canPredict}
              onChange={(e) => setHome(e.target.value.replace(/\D/g, "").slice(0, 2))}
              className={scoreInputClass(canPredict)}
            />
            <span className="text-muted-foreground">:</span>
            <Input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              aria-label={`${match.away_team ?? "Away"} predicted goals`}
              value={away}
              disabled={!canPredict}
              onChange={(e) => setAway(e.target.value.replace(/\D/g, "").slice(0, 2))}
              className={scoreInputClass(canPredict)}
            />
          </div>
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

      {/* Visitors only ever see footer content on an upcoming match ("Worth up
          to N" / "Awaiting teams"); for a locked or finished one it would be
          an empty bar, so drop it. */}
      {(signedIn || !locked) && (
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-1">
        <div className="min-h-6 text-xs text-muted-foreground">
          {!predictable && !locked && "Awaiting teams"}
          {predictable &&
            (prediction ? (
              <span className="flex items-center gap-1 text-primary">
                <Check className="size-3" /> Saved {prediction.home_pred}–
                {prediction.away_pred}
              </span>
            ) : (
              `Worth up to ${maxPoints(match.stage)} pts`
            ))}
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
            className="text-muted-foreground"
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
