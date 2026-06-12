import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useMatches, useAdminUpdateMatch } from "@/hooks/queries"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { StageBadge } from "@/components/StageBadge"
import { TeamDisplay } from "@/components/TeamDisplay"
import { DayHeader } from "@/components/DayHeader"
import { EmptyState } from "@/components/EmptyState"
import { ListSkeleton } from "@/components/ListSkeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from "lucide-react"
import { dayHeading, dayKey, kickoffTime } from "@/lib/format"
import type { MatchRow } from "@/lib/types"

export function Admin() {
  const { data: matches, isLoading } = useMatches()
  const update = useAdminUpdateMatch()
  const [query, setQuery] = useState("")

  const todayKey = dayKey(new Date().toISOString())

  // Filter, cap to 60 rows, then group the survivors by calendar day so the
  // list reads like the Matches view (sticky day headers + match cards).
  const grouped = useMemo(() => {
    if (!matches) return []
    const q = query.trim().toLowerCase()
    const list = q
      ? matches.filter(
          (m) =>
            m.home_team?.toLowerCase().includes(q) ||
            m.away_team?.toLowerCase().includes(q) ||
            m.group_name?.toLowerCase() === q ||
            String(m.id) === q
        )
      : matches
    const byDay = new Map<string, MatchRow[]>()
    for (const m of list.slice(0, 60)) {
      const key = dayKey(m.kickoff)
      if (!byDay.has(key)) byDay.set(key, [])
      byDay.get(key)!.push(m)
    }
    return [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [matches, query])

  return (
    <div className="flex flex-col gap-4">
      <Alert>
        <Info />
        <AlertTitle>Manual override</AlertTitle>
        <AlertDescription>
          The scheduled sync fills results automatically. Use this to correct or
          enter a result early. Saving with status FINISHED scores it instantly.
        </AlertDescription>
      </Alert>

      <Input
        placeholder="Search by team, group letter, or match #"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {isLoading && <ListSkeleton count={4} itemClassName="h-40 w-full" />}

      {!isLoading && grouped.length === 0 && (
        <EmptyState>
          {query.trim()
            ? "No matches found for your search."
            : "No matches yet. Seed the schedule to get started."}
        </EmptyState>
      )}

      {grouped.map(([day, dayMatches]) => (
        <section key={day} className="flex flex-col gap-3">
          <DayHeader
            heading={dayHeading(dayMatches[0].kickoff)}
            isToday={day === todayKey}
          />
          {dayMatches.map((m) => (
            <AdminRow
              key={m.id}
              match={m}
              saving={update.isPending && update.variables?.id === m.id}
              onSave={(payload) =>
                update.mutate(
                  { id: m.id, ...payload },
                  {
                    onSuccess: () =>
                      toast.success(`Match #${m.id} saved`, {
                        description:
                          payload.home_score != null &&
                          payload.away_score != null
                            ? `${m.home_team ?? "Home"} ${payload.home_score}–${payload.away_score} ${m.away_team ?? "Away"} · ${payload.status}`
                            : `${m.home_team ?? "Home"} v ${m.away_team ?? "Away"} · ${payload.status}`,
                      }),
                    onError: (err) =>
                      toast.error(
                        err instanceof Error ? err.message : "Save failed"
                      ),
                  }
                )
              }
            />
          ))}
        </section>
      ))}
    </div>
  )
}

function AdminRow({
  match,
  onSave,
  saving,
}: {
  match: MatchRow
  saving: boolean
  onSave: (payload: {
    home_score: number | null
    away_score: number | null
    status: string
    home_pens: number | null
    away_pens: number | null
    duration: string
    result_locked: boolean
  }) => void
}) {
  const [home, setHome] = useState(
    match.home_score != null ? String(match.home_score) : ""
  )
  const [away, setAway] = useState(
    match.away_score != null ? String(match.away_score) : ""
  )
  const num = (s: string) => (s === "" ? null : Number(s))
  const scoreInputClass = "h-11 w-14 text-center text-xl font-bold tabular-nums"

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between px-4 pt-3 text-xs text-muted-foreground">
        <StageBadge stage={match.stage} group={match.group_name} />
        <span>
          #{match.id} · {kickoffTime(match.kickoff)}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3">
        <TeamDisplay name={match.home_team} code={match.home_code} stack />
        <div className="flex items-center gap-1.5">
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            aria-label={`${match.home_team ?? "Home"} score`}
            value={home}
            onChange={(e) => setHome(e.target.value.replace(/\D/g, "").slice(0, 2))}
            className={scoreInputClass}
          />
          <span className="text-muted-foreground">:</span>
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            aria-label={`${match.away_team ?? "Away"} score`}
            value={away}
            onChange={(e) => setAway(e.target.value.replace(/\D/g, "").slice(0, 2))}
            className={scoreInputClass}
          />
        </div>
        <TeamDisplay
          name={match.away_team}
          code={match.away_code}
          align="right"
          stack
        />
      </div>

      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{match.status}</Badge>
          <Switch
            id={`lock-${match.id}`}
            checked={match.result_locked}
            disabled={saving}
            onCheckedChange={(checked) =>
              onSave({
                home_score: match.home_score,
                away_score: match.away_score,
                status: match.status,
                home_pens: match.home_pens,
                away_pens: match.away_pens,
                duration: match.duration,
                result_locked: checked,
              })
            }
          />
          <label
            htmlFor={`lock-${match.id}`}
            className="cursor-pointer text-xs text-muted-foreground"
          >
            Lock result
          </label>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={saving}
            onClick={() =>
              onSave({
                home_score: num(home),
                away_score: num(away),
                status: "IN_PLAY",
                home_pens: null,
                away_pens: null,
                duration: "REGULAR",
                result_locked: true,
              })
            }
          >
            Save live
          </Button>
          <Button
            size="sm"
            disabled={saving || home === "" || away === ""}
            onClick={() =>
              onSave({
                home_score: num(home),
                away_score: num(away),
                status: "FINISHED",
                home_pens: null,
                away_pens: null,
                duration: "REGULAR",
                result_locked: true,
              })
            }
          >
            Final
          </Button>
        </div>
      </div>
    </Card>
  )
}
