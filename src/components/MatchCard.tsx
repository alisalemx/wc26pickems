import { useState, type CSSProperties } from "react"
import { motion, useReducedMotion } from "motion/react"
import { ChevronDown, Lock, CheckCircle2, ArrowUpRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { StageBadge } from "./StageBadge"
import { Whistle } from "./Whistle"
import { ResultBadge } from "./ResultBadge"
import { TeamDisplay } from "./TeamDisplay"
import { PredictionCountdown } from "./PredictionCountdown"
import { TeamForm } from "./TeamForm"
import { TeamInfoDialog } from "./TeamInfoDialog"
import { ScorePair } from "./ScoreInput"
import { kickoffTime, isLocked, isLive } from "@/lib/format"
import { liveScoreUrl } from "@/lib/links"
import { scorePrediction, maxPoints, EXACT_BASE } from "@/lib/scoring"
import {
  useRevealedPredictions,
  usePredictionDistribution,
  useTeamForm,
  useTournamentForm,
} from "@/hooks/queries"
import type { MatchRow, PredictionRow } from "@/lib/types"
import { cn } from "@/lib/utils"

interface Props {
  match: MatchRow
  prediction?: PredictionRow
  ownUserId?: string
  onSave: (homePred: number, awayPred: number) => void
  saving?: boolean
  /** Position in the list — drives the entrance stagger via the --i CSS var. */
  index?: number
}

export function MatchCard({
  match,
  prediction,
  ownUserId,
  onSave,
  saving,
  index = 0,
}: Props) {
  const signedIn = ownUserId != null
  const reduceMotion = useReducedMotion()
  const locked = isLocked(match.kickoff)
  const finished =
    match.status === "FINISHED" &&
    match.home_score != null &&
    match.away_score != null
  // Pulse LIVE only within a plausible match window — a feed left stuck at
  // IN_PLAY past full time should fall back to the locked state, not pulse forever.
  const live = isLive(match.kickoff, match.status, match.stage)
  // Show the running score while a match is on. We now sync in-play scores
  // (ESPN for the knockouts, football-data for the group stage), so a live card
  // can display the current scoreline, not just a LIVE pulse. Guarded on
  // non-null scores so a just-kicked-off match we haven't synced yet falls back
  // to the plain LIVE label. `live` is false once FINISHED, so this never
  // overlaps `finished`.
  const liveScore =
    live && match.home_score != null && match.away_score != null
  const predictable =
    !locked && match.home_team != null && match.away_team != null
  // Anonymous visitors can see the match but can't enter or save a prediction.
  const canPredict = predictable && signedIn

  // Recent form per side: frozen pre-tournament 5 (team_form) + live
  // in-tournament results (derived from matches), shown either side of a divider.
  const preByCode = useTeamForm().data
  const tourByCode = useTournamentForm()
  const homePre = match.home_code ? preByCode?.[match.home_code]?.form : null
  const awayPre = match.away_code ? preByCode?.[match.away_code]?.form : null
  const homeTour = match.home_code ? tourByCode[match.home_code] : null
  const awayTour = match.away_code ? tourByCode[match.away_code] : null
  const showForm =
    !finished && Boolean(homePre || awayPre || homeTour || awayTour)
  // The "Compare" button (team-info dialog) needs both teams resolved.
  const bothKnown = Boolean(match.home_code && match.away_code)

  const [home, setHome] = useState(prediction ? String(prediction.home_pred) : "")
  const [away, setAway] = useState(prediction ? String(prediction.away_pred) : "")
  const [expanded, setExpanded] = useState(false)
  // Once opened, keep RevealedPicks mounted so the grid-rows collapse has
  // content to animate shrinking — gating it on `expanded` alone unmounts the
  // body instantly and the close looks like a jump cut. Still lazy on first open.
  const [everExpanded, setEverExpanded] = useState(false)

  // The prediction arrives asynchronously (and can change after a save). Sync
  // the inputs during render when the stored value changes — React's
  // recommended alternative to a setState-in-effect. Adopt the new value only
  // when the user isn't mid-edit (the inputs still match what we last synced),
  // so an incoming refetch can't clobber an in-progress edit.
  const incomingHome = prediction ? String(prediction.home_pred) : ""
  const incomingAway = prediction ? String(prediction.away_pred) : ""
  const [syncedHome, setSyncedHome] = useState(incomingHome)
  const [syncedAway, setSyncedAway] = useState(incomingAway)
  if (incomingHome !== syncedHome || incomingAway !== syncedAway) {
    if (home === syncedHome && away === syncedAway) {
      setHome(incomingHome)
      setAway(incomingAway)
    }
    setSyncedHome(incomingHome)
    setSyncedAway(incomingAway)
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
    canPredict ||
    (signedIn && locked)

  return (
    <Card
      className="gap-0 overflow-hidden py-0 animate-in fade-in-0 slide-in-from-bottom-2 duration-[var(--duration-base)] ease-out-quint stagger-in"
      style={{ "--i": index } as CSSProperties}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pt-3 text-[13px] text-muted-foreground sm:text-xs">
        <StageBadge
          stage={match.stage}
          group={match.group_name}
          className="justify-self-start"
        />

        {/* Center slot: absolute kickoff time (in strong foreground ink) on
            upcoming/ended cards. While the match is in progress (kickoff passed,
            no final result yet, within the live window) it carries a pulsing
            "LIVE" label linking out to live scores. */}
        {live ? (
          <LiveLabel match={match} />
        ) : (
          <span className="justify-self-center font-medium tabular-nums text-foreground">
            {kickoffTime(match.kickoff)}
          </span>
        )}

        <span
          className={cn(
            "flex items-center justify-self-end gap-1",
            finished && "text-muted-foreground"
          )}
        >
          {locked ? (
            <>
              {finished ? (
                <>
                  <Whistle className="size-[18px]" /> Ended
                </>
              ) : (
                <>
                  <Lock className="size-3" /> Locked
                </>
              )}
            </>
          ) : predictable ? (
            // Teams are set and kickoff is ahead — the live window to get a
            // prediction in before it locks.
            <PredictionCountdown kickoff={match.kickoff} />
          ) : null}
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-3">
        <TeamDisplay name={match.home_team} code={match.home_code} stack />
        <div className="flex justify-center">
          {signedIn ? (
            canPredict ? (
              // Editable: the boxes hold (or capture) your prediction.
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
            ) : prediction || finished || liveScore ? (
              // Locked/live/finished: drop the disabled boxes and show text
              // instead — your Pick above the live Score while the match is on,
              // or the final Result once it's in. Labels are left-aligned so the
              // score label sits under "Pick" with the scores in their own
              // column; the shootout score tucks under the result score it
              // decided (column 2), not the label.
              <div className="grid grid-cols-[auto_auto] items-baseline gap-x-4 gap-y-1 leading-none">
                {prediction && (
                  <>
                    <span className="text-sm text-muted-foreground">Pick</span>
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {prediction.home_pred}–{prediction.away_pred}
                    </span>
                  </>
                )}
                {liveScore && (
                  <>
                    <span className="text-sm font-medium text-green-600 dark:text-green-500">
                      Score
                    </span>
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {match.home_score}–{match.away_score}
                    </span>
                  </>
                )}
                {finished && (
                  <>
                    <span className="text-sm text-muted-foreground">Result</span>
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {match.home_score}–{match.away_score}
                    </span>
                  </>
                )}
                {finished &&
                  match.duration === "PENALTY_SHOOTOUT" &&
                  match.home_pens != null && (
                    <span className="col-start-2 text-[10px] text-muted-foreground">
                      pens {match.home_pens}–{match.away_pens}
                    </span>
                  )}
              </div>
            ) : (
              // Signed in, no pick, match not started (e.g. TBD knockout slot).
              <span className="px-3 text-sm font-medium text-muted-foreground">
                vs
              </span>
            )
          ) : finished ? (
            // Visitor, match over: show the final score instead of empty inputs.
            <div className="flex flex-col items-center leading-none">
              <span className="text-2xl font-bold tabular-nums">
                {match.home_score}–{match.away_score}
              </span>
              {match.duration === "PENALTY_SHOOTOUT" &&
                match.home_pens != null && (
                  <span className="mt-1 text-[10px] text-muted-foreground">
                    pens {match.home_pens}–{match.away_pens}
                  </span>
                )}
            </div>
          ) : liveScore ? (
            // Visitor, match in progress: the running score (the center LIVE
            // pulse already flags that it's live).
            <span className="text-2xl font-bold tabular-nums">
              {match.home_score}–{match.away_score}
            </span>
          ) : (
            // Visitor, upcoming match: nothing to show yet.
            <span className="px-3 text-sm font-medium text-muted-foreground">
              vs
            </span>
          )}
        </div>
        <TeamDisplay name={match.away_team} code={match.away_code} align="right" stack />

        {bothKnown && !finished && (
          <>
            {showForm ? (
              <TeamForm
                pre={homePre}
                tournament={homeTour}
                className="justify-self-center"
              />
            ) : (
              <div />
            )}
            <div className="flex justify-center">
              <TeamInfoDialog match={match} />
            </div>
            {showForm ? (
              <TeamForm
                pre={awayPre}
                tournament={awayTour}
                className="justify-self-center"
              />
            ) : (
              <div />
            )}
          </>
        )}
      </div>

      {canPredict &&
        (match.stage === "GROUP" ? (
          <PopularPicks
            matchId={match.id}
            selected={`${home}-${away}`}
            onPick={(h, a) => {
              setHome(String(h))
              setAway(String(a))
            }}
          />
        ) : (
          <p className="px-4 pb-3 text-center text-xs text-muted-foreground">
            Popular picks are hidden in the knockout stage
          </p>
        ))}

      {hasFooter && (
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-1">
        <div className="flex min-h-6 items-center text-sm text-muted-foreground">
          {!predictable && !locked && "Awaiting teams"}
          {predictable &&
            (prediction ? (
              <motion.span
                key={`${prediction.home_pred}-${prediction.away_pred}`}
                initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
                className="flex items-center gap-1 text-primary"
              >
                <CheckCircle2 className="size-3.5" /> Saved {prediction.home_pred}–
                {prediction.away_pred}
              </motion.span>
            ) : maxPoints(match.stage) > EXACT_BASE ? (
              // Only flag the points on knockout cards, where the stage
              // multiplier bumps them above the base — otherwise every group
              // match repeats the same "Worth up to 3 pts".
              `Worth up to ${maxPoints(match.stage)} pts`
            ) : null)}
          {finished &&
            own &&
            (own.result === "EXACT" ? (
              // Celebrate only the current user's exact hit — a rare, personal
              // moment. Other people's exacts (RevealedPicks) stay calm.
              <motion.span
                initial={reduceMotion ? false : { scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.35 }}
              >
                <ResultBadge result={own.result} points={own.points} />
              </motion.span>
            ) : (
              <ResultBadge result={own.result} points={own.points} />
            ))}
        </div>

        <div>
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
              aria-expanded={expanded}
              aria-controls={`picks-${match.id}`}
              onClick={() => {
                setEverExpanded(true)
                setExpanded((v) => !v)
              }}
            >
              Picks
              <ChevronDown
                className={cn(
                  "size-4 transition-transform duration-[var(--duration-base)] ease-in-out-quart",
                  expanded && "rotate-180"
                )}
              />
            </Button>
          )}
        </div>
      </div>
      )}

      {signedIn && locked && (
        // Grid-rows 0fr→1fr collapse animates only the track (GPU-friendly).
        // RevealedPicks mounts on first open (lazy query) and then stays mounted
        // so collapsing animates the track shrinking instead of vanishing.
        <div
          id={`picks-${match.id}`}
          className="grid transition-[grid-template-rows] duration-[var(--duration-base)] ease-in-out-quart"
          style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            {everExpanded && <RevealedPicks match={match} ownUserId={ownUserId} />}
          </div>
        </div>
      )}
    </Card>
  )
}

/** Center label for a match in progress. The card body now shows the running
 *  score (we sync in-play scores), so this pulses "LIVE" and links out to a
 *  live-score search for the minute-by-minute detail (lineups, events). Falls
 *  back to a plain status label if the teams aren't resolved yet (TBD slots). */
function LiveLabel({ match }: { match: MatchRow }) {
  // The dot and the arrow flank "LIVE" in equal-width boxes so the word stays
  // centered in the card — without matched widths the wider arrow would drag it
  // off-center. The fallback's right box is an empty spacer balancing the dot.
  const flank = "flex w-4 items-center justify-center"
  const dot = (
    <span className={flank}>
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
      </span>
    </span>
  )
  const base =
    "flex items-center justify-self-center gap-0.5 font-medium text-green-600 dark:text-green-500"

  if (!match.home_team || !match.away_team) {
    return (
      <span className={base}>
        {dot}
        LIVE
        <span className={flank} aria-hidden />
      </span>
    )
  }

  return (
    <a
      href={liveScoreUrl(match.home_team, match.away_team)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        base,
        "-mx-1 rounded-sm px-1 underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:underline active:bg-foreground/10"
      )}
    >
      {dot}
      LIVE
      <span className={flank}>
        <ArrowUpRight className="size-3.5" />
      </span>
    </a>
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
  // The RPC returns only the top 3 scorelines, so percentages divide by the
  // match's full predictor count, not the sum of the rows received.
  const total = data[0].predictors

  return (
    <div className="flex flex-col items-center gap-1.5 px-4 pb-3">
      <span className="text-xs text-muted-foreground">Popular picks</span>
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {data.map((d) => {
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
  const finished =
    match.status === "FINISHED" &&
    match.home_score != null &&
    match.away_score != null

  return (
    <div className="bg-muted/30">
      {/* Separator sits at the very top edge so it lands on the white→muted
          boundary rather than floating inside the muted block. */}
      <Separator />
      <div className="px-4 py-3">
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
    </div>
  )
}
