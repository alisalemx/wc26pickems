import { Info } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FormPill } from "./TeamForm"
import { StageBadge } from "./StageBadge"
import { TeamDisplay } from "./TeamDisplay"
import { flagEmoji } from "@/lib/flags"
import { shortDayHeading, kickoffTime } from "@/lib/format"
import {
  useHeadToHead,
  useTeamForm,
  useTournamentResults,
  useUpcomingMatches,
} from "@/hooks/queries"
import type { MatchRow, TeamFormMatch, TeamHonor } from "@/lib/types"
import type { Outcome, TournamentResult } from "@/lib/form"
import { pairKey, perspectiveMeetings, type H2hPerspectiveRow } from "@/lib/h2h"
import { cn } from "@/lib/utils"

const STAGE_SHORT: Record<string, string> = {
  GROUP: "Group",
  R32: "R32",
  R16: "R16",
  QF: "QF",
  SF: "SF",
  THIRD: "3rd place",
  FINAL: "Final",
}

function ResultRow({
  outcome,
  gf,
  ga,
  opponent,
  label,
}: {
  outcome: Outcome
  gf: number
  ga: number
  opponent: string | null
  label: string
}) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <FormPill outcome={outcome} />
      <span className="tabular-nums font-medium">
        {gf}–{ga}
      </span>
      <span className="min-w-0 truncate">{opponent ?? "TBD"}</span>
      <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
        {label}
      </span>
    </li>
  )
}

/** A read-only fixture card for the modal's Upcoming tab: date + kickoff, the
 *  stage, and both teams either side of a "vs". No inputs / popular picks —
 *  predicting still happens on the matches tab. */
function UpcomingMatchCard({ match }: { match: MatchRow }) {
  return (
    <Card className="gap-2 px-4 py-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <StageBadge stage={match.stage} group={match.group_name} />
        <span className="tabular-nums">
          {shortDayHeading(match.kickoff)} · {kickoffTime(match.kickoff)}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <TeamDisplay name={match.home_team} code={match.home_code} size="sm" />
        <span className="px-1 text-xs font-medium text-muted-foreground">vs</span>
        <TeamDisplay
          name={match.away_team}
          code={match.away_code}
          size="sm"
          align="right"
        />
      </div>
    </Card>
  )
}

/** The team's not-yet-played matches, shown read-only. */
function UpcomingMatches({ code }: { code: string | null }) {
  const upcomingByCode = useUpcomingMatches()
  const matches = code ? upcomingByCode[code] ?? [] : []

  if (matches.length === 0) {
    return <p className="text-sm text-muted-foreground">No upcoming matches.</p>
  }

  return (
    <div className="space-y-3">
      {matches.map((m) => (
        <UpcomingMatchCard key={m.id} match={m} />
      ))}
    </div>
  )
}

function Section({
  title,
  empty,
  children,
}: {
  title: string
  empty?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {empty ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="space-y-1">{children}</ul>
      )}
    </div>
  )
}

/** Meeting date with the year — head-to-head spans 15 years, so the month/day
 *  formats used elsewhere would be ambiguous: "Nov 16, 2022". Parsed at noon,
 *  not via new Date(iso): a bare YYYY-MM-DD parses as UTC midnight, which
 *  toLocaleDateString renders as the previous day in western timezones. */
function meetingDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

/** The form/results/honours sections — shared by the tabbed single-team view
 *  and the (tab-less) two-team comparison. */
function FormSections({
  pre,
  tournament,
  honors,
  h2h,
  className,
}: {
  pre: TeamFormMatch[]
  tournament: TournamentResult[]
  honors: TeamHonor[]
  /** Head-to-head meetings from this panel's team's perspective. Only
   *  supplied in the two-team Compare modal, and only for knockout matches
   *  (see TeamInfoDialog). */
  h2h?: H2hPerspectiveRow[]
  className?: string
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {h2h && (
        <Section
          title="Head-to-head (last 15 years)"
          empty={h2h.length === 0}
        >
          <li className="pb-1 text-sm font-medium tabular-nums">
            {h2h.filter((r) => r.outcome === "W").length}W ·{" "}
            {h2h.filter((r) => r.outcome === "D").length}D ·{" "}
            {h2h.filter((r) => r.outcome === "L").length}L
          </li>
          {h2h.map((r, i) => (
            <ResultRow
              key={i}
              outcome={r.outcome}
              gf={r.gf}
              ga={r.ga}
              opponent={meetingDate(r.date)}
              label={r.competition}
            />
          ))}
        </Section>
      )}

      <Section title="Form (tournament)" empty={tournament.length === 0}>
        {[...tournament].reverse().map((r) => (
          <ResultRow
            key={r.matchId}
            outcome={r.outcome}
            gf={r.gf}
            ga={r.ga}
            opponent={r.opponent}
            label={STAGE_SHORT[r.stage] ?? r.stage}
          />
        ))}
      </Section>

      <Section title="Form (pre-tournament)" empty={pre.length === 0}>
        {[...pre].reverse().map((r, i) => (
          <ResultRow
            key={i}
            outcome={r.outcome}
            gf={r.gf}
            ga={r.ga}
            opponent={r.opponent}
            label={r.competition}
          />
        ))}
      </Section>

      <Section title="Honours" empty={honors.length === 0}>
        {honors.map((h, i) => (
          <li key={i} className="text-sm">
            <span className="font-medium">{h.competition}</span>
            <span className="text-muted-foreground"> ×{h.count}</span>
            {h.years.length > 0 && (
              <span className="block text-xs tabular-nums text-muted-foreground">
                {h.years.join(", ")}
              </span>
            )}
          </li>
        ))}
      </Section>
    </div>
  )
}

function TeamPanel({
  name,
  code,
  pre,
  tournament,
  honors,
  h2h,
  showUpcoming = false,
  className,
  headerClassName,
}: {
  name: string | null
  code: string | null
  pre: TeamFormMatch[]
  tournament: TournamentResult[]
  honors: TeamHonor[]
  h2h?: H2hPerspectiveRow[]
  /** Show Form/Upcoming tabs. Off in the two-team comparison, which is already
   *  busy enough side-by-side — there it renders just the form sections. */
  showUpcoming?: boolean
  className?: string
  headerClassName?: string
}) {
  const sections = (
    <FormSections pre={pre} tournament={tournament} honors={honors} h2h={h2h} />
  )

  return (
    <div className={cn("space-y-4", className)}>
      <div className={cn("flex items-center gap-2", headerClassName)}>
        <span className="text-3xl leading-none">{flagEmoji(code)}</span>
        <span className="font-semibold">{name ?? "TBD"}</span>
      </div>

      {showUpcoming ? (
        <Tabs defaultValue="upcoming" className="gap-4">
          <TabsList className="w-full">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="form">Form</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming">
            <UpcomingMatches code={code} />
          </TabsContent>
          <TabsContent value="form">{sections}</TabsContent>
        </Tabs>
      ) : (
        sections
      )}
    </div>
  )
}

/** Modal with one team's recent form, results so far this tournament, upcoming
 *  fixtures, and honours. Used in the group standings, where the whole row is
 *  the trigger — so this is controlled (`open`/`onOpenChange`) with no built-in
 *  trigger button; the row renders its own info-icon affordance. */
export function TeamDetailDialog({
  name,
  code,
  open,
  onOpenChange,
}: {
  name: string | null
  code: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const formByCode = useTeamForm().data
  const tourByCode = useTournamentResults()
  const form = code ? formByCode?.[code] : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[5dvh] max-h-[90dvh] translate-y-0 overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2">
            <span className="text-2xl leading-none">{flagEmoji(code)}</span>
            {name ?? "Team"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {name ?? "Team"} — recent form, this tournament, and honours.
          </DialogDescription>
        </DialogHeader>
        <TeamPanel
          name={name}
          code={code}
          pre={form?.results ?? []}
          tournament={code ? tourByCode[code] ?? [] : []}
          honors={form?.honors ?? []}
          showUpcoming
          headerClassName="hidden"
        />
      </DialogContent>
    </Dialog>
  )
}

/** Info-icon button that opens a modal comparing both teams' recent form, their
 *  results so far in this tournament, and the major trophies they've won. */
export function TeamInfoDialog({ match }: { match: MatchRow }) {
  const formByCode = useTeamForm().data
  const tourByCode = useTournamentResults()
  const h2hByPair = useHeadToHead().data

  const formFor = (code: string | null) => (code ? formByCode?.[code] : undefined)

  // Head-to-head shows in the knockout only, and each panel gets the meetings
  // from its own team's perspective.
  const meetings =
    match.stage !== "GROUP" && match.home_code && match.away_code
      ? h2hByPair?.[pairKey(match.home_code, match.away_code)] ?? []
      : null
  const h2hFor = (ownCode: string | null): H2hPerspectiveRow[] | undefined =>
    meetings && ownCode ? perspectiveMeetings(meetings, ownCode) : undefined

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs font-medium text-muted-foreground"
          aria-label="Compare teams"
        >
          <Info className="size-3.5" /> Compare
        </Button>
      </DialogTrigger>
      <DialogContent className="top-[5dvh] max-h-[90dvh] translate-y-0 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Comparison</DialogTitle>
          <DialogDescription className="sr-only">
            {match.home_team ?? "Home"} vs {match.away_team ?? "Away"} — recent
            form, this tournament, and honours.
          </DialogDescription>
        </DialogHeader>
        {(() => {
          const homePanel = (
            <TeamPanel
              name={match.home_team}
              code={match.home_code}
              pre={formFor(match.home_code)?.results ?? []}
              tournament={match.home_code ? tourByCode[match.home_code] ?? [] : []}
              honors={formFor(match.home_code)?.honors ?? []}
              h2h={h2hFor(match.home_code)}
              headerClassName="hidden sm:flex"
            />
          )
          const awayPanel = (
            <TeamPanel
              name={match.away_team}
              code={match.away_code}
              pre={formFor(match.away_code)?.results ?? []}
              tournament={match.away_code ? tourByCode[match.away_code] ?? [] : []}
              honors={formFor(match.away_code)?.honors ?? []}
              h2h={h2hFor(match.away_code)}
              headerClassName="hidden sm:flex"
            />
          )
          return (
            <>
              {/* Mobile: switch between teams with a segmented control */}
              <Tabs defaultValue="home" className="gap-4 sm:hidden">
                <TabsList className="w-full">
                  <TabsTrigger value="home">
                    {flagEmoji(match.home_code)} {match.home_team ?? "Home"}
                  </TabsTrigger>
                  <TabsTrigger value="away">
                    {flagEmoji(match.away_code)} {match.away_team ?? "Away"}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="home">{homePanel}</TabsContent>
                <TabsContent value="away">{awayPanel}</TabsContent>
              </Tabs>

              {/* Desktop: both teams side by side */}
              <div className="hidden gap-8 sm:grid sm:grid-cols-2">
                {homePanel}
                {awayPanel}
              </div>
            </>
          )
        })()}
      </DialogContent>
    </Dialog>
  )
}
