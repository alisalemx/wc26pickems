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
import { FormPill } from "./TeamForm"
import { flagEmoji } from "@/lib/flags"
import { useTeamForm, useTournamentResults } from "@/hooks/queries"
import type { MatchRow, TeamFormMatch, TeamHonor } from "@/lib/types"
import type { Outcome, TournamentResult } from "@/lib/form"
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

function TeamPanel({
  name,
  code,
  pre,
  tournament,
  honors,
  className,
}: {
  name: string | null
  code: string | null
  pre: TeamFormMatch[]
  tournament: TournamentResult[]
  honors: TeamHonor[]
  className?: string
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <span className="text-3xl leading-none">{flagEmoji(code)}</span>
        <span className="font-semibold">{name ?? "TBD"}</span>
      </div>

      <Section title="Last 5 (pre-tournament)" empty={pre.length === 0}>
        {pre.map((r, i) => (
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

      <Section title="This tournament" empty={tournament.length === 0}>
        {tournament.map((r) => (
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

/** Info-icon button that opens a modal comparing both teams' recent form, their
 *  results so far in this tournament, and the major trophies they've won. */
export function TeamInfoDialog({ match }: { match: MatchRow }) {
  const formByCode = useTeamForm().data
  const tourByCode = useTournamentResults()

  const formFor = (code: string | null) => (code ? formByCode?.[code] : undefined)

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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Team details</DialogTitle>
          <DialogDescription>
            {match.home_team ?? "Home"} vs {match.away_team ?? "Away"} — recent
            form, this tournament, and honours.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
          <TeamPanel
            name={match.home_team}
            code={match.home_code}
            pre={formFor(match.home_code)?.results ?? []}
            tournament={match.home_code ? tourByCode[match.home_code] ?? [] : []}
            honors={formFor(match.home_code)?.honors ?? []}
          />
          <TeamPanel
            name={match.away_team}
            code={match.away_code}
            pre={formFor(match.away_code)?.results ?? []}
            tournament={match.away_code ? tourByCode[match.away_code] ?? [] : []}
            honors={formFor(match.away_code)?.honors ?? []}
            className="border-t border-border pt-6 sm:border-t-0 sm:pt-0"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
