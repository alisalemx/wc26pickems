import { useEffect, useRef, useState, type CSSProperties } from "react"
import { motion, useReducedMotion } from "motion/react"
import { ChevronDown, Lock, CheckCircle2 } from "lucide-react"
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
import { useLiveSeconds } from "@/hooks/useCountdown"
import { kickoffTime, isPredictionLocked, isLive, parseClockMinute, formatClock } from "@/lib/format"
import { scorePrediction, maxPoints, EXACT_BASE } from "@/lib/scoring"
import {
  useRevealedPredictions,
  usePredictionDistribution,
  useTeamForm,
  useTournamentForm,
} from "@/hooks/queries"
import { entranceClasses, type Entrance } from "@/lib/entrance"
import type { MatchRow, PredictionRow } from "@/lib/types"
import { cn } from "@/lib/utils"

// The --ease-out-quart token (index.css), for the Picks panel's Motion height.
const EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const

/** How long a height change takes, in seconds: proportional to the distance
 *  (500px a second), kept between 150 and 270ms so a small change stays quick
 *  and a big one never drags. */
const heightDuration = (delta: number) =>
  Math.min(Math.max(delta / 500, 0.15), 0.27)

interface Props {
  match: MatchRow
  prediction?: PredictionRow
  ownUserId?: string
  onSave: (homePred: number, awayPred: number) => void
  saving?: boolean
  /** Position in the list — drives the entrance stagger via the --i CSS var. */
  index?: number
  /** How the card arrives (see src/lib/entrance.ts): the slide-up cascade on
   *  the list's first load, a quick fade after a pointer switch, or nothing
   *  after an arrow-key switch. Read once, at mount, so a card that stays on
   *  screen through a switch never replays it. */
  entrance?: Entrance
  /** Flash the one-shot gold attention ring (the reminder banner's "Predict
   *  next" CTA just jumped here). */
  highlighted?: boolean
}

export function MatchCard({
  match,
  prediction,
  ownUserId,
  onSave,
  saving,
  index = 0,
  entrance = "cascade",
  highlighted,
}: Props) {
  const [arrival] = useState(entrance)
  const signedIn = ownUserId != null
  const reduceMotion = useReducedMotion()
  const locked = isPredictionLocked(match)
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
  // Which side lost a finished match — greyed out + faded on the card. Judged
  // on the 90'+ET score, with the penalty shootout breaking a knockout draw
  // (mirrors how scoring reads the result). A genuine draw has no loser.
  const homeLost =
    finished &&
    (match.away_score! > match.home_score! ||
      (match.home_score === match.away_score &&
        match.home_pens != null &&
        match.away_pens != null &&
        match.away_pens > match.home_pens))
  const awayLost =
    finished &&
    (match.home_score! > match.away_score! ||
      (match.home_score === match.away_score &&
        match.home_pens != null &&
        match.away_pens != null &&
        match.home_pens > match.away_pens))
  // Predicting needs the teams to be STORED in the DB, not just derived on the
  // client from feeder winners: the RLS insert policy checks the stored teams,
  // so a Save built on a provisional (client-filled) knockout slot would be
  // rejected with a confusing "match locked?" error. The teams still display —
  // only the Save unlocks once the server has filled the slot (see 0016).
  const predictable =
    !locked &&
    match.home_team != null &&
    match.away_team != null &&
    !match.teams_provisional
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
    locked

  return (
    <Card
      id={`match-${match.id}`}
      className={cn(
        "gap-0 overflow-hidden py-0",
        entranceClasses(
          arrival,
          "animate-in fade-in-0 slide-in-from-bottom-2 animation-duration-[var(--duration-base)] ease-out-quint stagger-in"
        ),
        highlighted && "match-highlight"
      )}
      style={{ "--i": index } as CSSProperties}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pt-4 text-[13px] text-muted-foreground sm:px-5">
        <StageBadge
          stage={match.stage}
          group={match.group_name}
          className="justify-self-start"
        />

        {/* Center slot: the kickoff (match start) time, in strong foreground
            ink, shown in every state — including while the match is live, where
            the right slot carries the live elapsed-time clock and a small lock
            by your "Pick" below marks that predictions are locked. */}
        <span className="justify-self-center font-semibold tabular-nums text-foreground">
          {kickoffTime(match.kickoff)}
        </span>

        <span
          className={cn(
            "flex items-center justify-self-end gap-1",
            finished && "text-muted-foreground"
          )}
        >
          {live ? (
            // In progress: the pulsing live clock. The "locked" state is marked
            // by a small lock icon next to your "Pick" below, not here.
            <LiveLabel match={match} />
          ) : locked ? (
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

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 px-4 pt-4 pb-4 sm:px-5">
        <TeamDisplay
          name={match.home_team}
          code={match.home_code}
          stack
          dim={homeLost}
        />
        <div className="flex min-w-24 justify-center">
          {canPredict ? (
            // Editable: the boxes hold (or capture) your prediction.
            <ScorePair
              home={home}
              away={away}
              onHome={setHome}
              onAway={setAway}
              homeLabel={`${match.home_team ?? "Home"} predicted goals`}
              awayLabel={`${match.away_team ?? "Away"} predicted goals`}
            />
          ) : finished || liveScore ? (
            // The scoreline is the headline: the final result, or the running
            // score while the match is on. The shootout tucks under the score
            // it decided, and your locked pick sits beneath as the second line.
            <div className="flex flex-col items-center gap-1.5">
              {liveScore && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-destructive" />
                  </span>
                  Live
                </span>
              )}
              <motion.span
                key={`${match.home_score}-${match.away_score}`}
                initial={reduceMotion || finished ? false : { scale: 0.85 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
                className="text-4xl leading-none font-bold tabular-nums tracking-display sm:text-[2.75rem]"
              >
                {match.home_score}
                <span className="mx-1 text-quiet">–</span>
                {match.away_score}
              </motion.span>
              {finished &&
                match.duration === "PENALTY_SHOOTOUT" &&
                match.home_pens != null && (
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {match.home_pens}–{match.away_pens} on pens
                  </span>
                )}
              {signedIn && prediction && (
                <span className="flex items-center gap-1 text-xs font-medium tabular-nums text-muted-foreground">
                  <Lock aria-label="Locked" className="size-3" />
                  Your pick {prediction.home_pred}–{prediction.away_pred}
                </span>
              )}
            </div>
          ) : signedIn && prediction ? (
            // Kicked off but no score synced yet: your locked pick holds the
            // centre until the live score arrives.
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-3xl leading-none font-bold tabular-nums tracking-display">
                {prediction.home_pred}
                <span className="mx-1 text-quiet">–</span>
                {prediction.away_pred}
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Lock aria-label="Locked" className="size-3" />
                Your pick
              </span>
            </div>
          ) : (
            // Nothing to show yet: an upcoming match for a visitor, or a slot
            // still waiting on its teams.
            <span className="text-sm font-semibold text-quiet">vs</span>
          )}
        </div>
        <TeamDisplay
          name={match.away_team}
          code={match.away_code}
          align="right"
          stack
          dim={awayLost}
        />

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
          <p className="px-4 pb-4 text-center text-xs text-muted-foreground">
            Popular picks are hidden in the knockout stage
          </p>
        ))}

      {hasFooter && (
      <div className="mt-1 flex min-h-14 items-center justify-between gap-2 border-t border-border px-4 py-2.5 sm:px-5">
        <div className="flex min-h-6 items-center text-sm text-muted-foreground">
          {!predictable &&
            !locked &&
            // Both teams already showing but not yet predictable = a knockout
            // slot resolved on the client, waiting on the server to store it and
            // lift the lock. Otherwise the slot's teams genuinely aren't known.
            (match.home_team != null && match.away_team != null
              ? "Opens shortly"
              : "Awaiting teams")}
          {predictable &&
            (prediction ? (
              <motion.span
                key={`${prediction.home_pred}-${prediction.away_pred}`}
                initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
                className="flex items-center gap-1.5 font-medium text-foreground tabular-nums"
              >
                <CheckCircle2 className="size-4 text-signal" aria-hidden /> Saved{" "}
                {prediction.home_pred}–{prediction.away_pred}
              </motion.span>
            ) : maxPoints(match.stage) > EXACT_BASE ? (
              // Only flag the points on knockout cards, where the stage
              // multiplier bumps them above the base — otherwise every group
              // match repeats the same "Worth up to 3 pts".
              `Worth up to ${maxPoints(match.stage)} pts`
            ) : null)}
          {finished && own && (
            <ResultBadge result={own.result} points={own.points} />
          )}
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
          {locked && (
            <Button
              size="sm"
              variant="secondary"
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
                  "size-4 transition-transform duration-[var(--duration-base)] ease-out-quart",
                  expanded && "rotate-180"
                )}
              />
            </Button>
          )}
        </div>
      </div>
      )}

      {locked && (
        // Grid-rows 0fr→1fr collapse animates the track to the content's height
        // (a layout animation, fine for an occasional tap). ease-out-quart so it
        // moves the moment you tap. RevealedPicks mounts on first open (lazy
        // query) and then stays mounted so collapsing animates the track
        // shrinking instead of vanishing.
        <div
          id={`picks-${match.id}`}
          className="grid transition-[grid-template-rows] duration-[var(--duration-base)] ease-out-quart"
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

/** Right-slot label for a match in progress (where "Locked" sits otherwise).
 *  Just the live match clock (see `LiveClock`) — the pulsing green dot lives
 *  beside the "Live" score label below, not here. */
function LiveLabel({ match }: { match: MatchRow }) {
  return (
    <span className="flex items-center gap-1.5 font-semibold tabular-nums text-destructive">
      <LiveClock
        minute={match.minute}
        updatedAt={match.updated_at}
        kickoff={match.kickoff}
      />
    </span>
  )
}

/** The ticking "M:SS" clock inside `LiveLabel`. When ESPN has reported a clean
 *  minute ("67'") we anchor on it and tick the seconds forward from the moment
 *  it was synced (`updatedAt`), re-anchoring on each sync — so the real
 *  broadcast minute stays accurate while the seconds animate between the ~2-min
 *  syncs. ESPN's non-numeric labels — halftime "HT" and stoppage clocks
 *  ("45'+2'") — are shown verbatim (extrapolating seconds across them would
 *  mislead). With no synced minute yet (the first moments after kickoff, a sync
 *  gap, or a group match, which isn't ESPN-synced) it ticks "M:SS" from kickoff
 *  as a wall-clock fallback. Local ticking state re-renders only this span. */
function LiveClock({
  minute,
  updatedAt,
  kickoff,
}: {
  minute: string | null
  updatedAt: string
  kickoff: string
}) {
  const anchorMin = parseClockMinute(minute)
  const synced = anchorMin != null
  const verbatim = minute != null && !synced // "HT" / stoppage — show as-is
  const seconds = useLiveSeconds(
    synced ? updatedAt : kickoff,
    anchorMin ?? 0,
    !verbatim
  )
  if (verbatim) return <span>{minute}</span>
  return <span>{formatClock(seconds)}</span>
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
    <div className="flex flex-col items-center gap-2 px-4 pb-4">
      <span className="text-xs font-medium text-muted-foreground">Popular picks</span>
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {data.map((d) => {
          const key = `${d.home_pred}-${d.away_pred}`
          const active = key === selected
          return (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={active ? "default" : "secondary"}
              onClick={() => onPick(d.home_pred, d.away_pred)}
              className="h-8 gap-1.5 px-3 text-xs"
            >
              <span className="font-semibold tabular-nums">
                {d.home_pred}–{d.away_pred}
              </span>
              <span
                className={cn(
                  "tabular-nums",
                  active ? "text-primary-foreground/70" : "text-muted-foreground"
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
  const reduceMotion = useReducedMotion()
  const finished =
    match.status === "FINISHED" &&
    match.home_score != null &&
    match.away_score != null

  // The panel opens on "Loading picks…" and the list lands a moment later,
  // which used to grow the panel (and shove every card below) in one frame.
  // So the panel's height follows its content: the first measure applies
  // instantly (the card's grid-rows expand handles the opening), and each
  // change after that animates, with a duration scaled to how far it moves.
  const contentRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ height: number; duration: number } | null>(
    null
  )
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const height = entry.borderBoxSize[0].blockSize
      setBox((prev) =>
        prev?.height === height
          ? prev
          : {
              height,
              duration: prev ? heightDuration(Math.abs(height - prev.height)) : 0,
            }
      )
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <motion.div
      className="overflow-hidden bg-muted/60"
      initial={false}
      animate={{ height: box?.height ?? "auto" }}
      transition={{
        duration: reduceMotion ? 0 : (box?.duration ?? 0),
        ease: EASE_OUT_QUART,
      }}
    >
      <div ref={contentRef}>
      {/* Separator sits at the very top edge so it lands on the white→muted
          boundary rather than floating inside the muted block. */}
      <Separator />
      <div className="px-4 py-3 sm:px-5">
      {isLoading && (
        <p className="text-xs text-muted-foreground">Loading picks…</p>
      )}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <p className="text-xs text-muted-foreground">No predictions.</p>
      )}
      <ul className="flex flex-col gap-2">
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
                <span className="truncate font-medium">@{p.username}</span>
                {p.user_id === ownUserId && (
                  <Badge variant="outline" className="h-5 px-2 text-[11px]">
                    You
                  </Badge>
                )}
              </span>
              <span className="flex items-center gap-2">
                <span className="font-semibold tabular-nums">
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
    </motion.div>
  )
}
