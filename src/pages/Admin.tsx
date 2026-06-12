import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useMatches, useAdminUpdateMatch } from "@/hooks/queries"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { StageBadge } from "@/components/StageBadge"
import { TeamDisplay } from "@/components/TeamDisplay"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from "lucide-react"
import { dayHeading, kickoffTime } from "@/lib/format"
import type { MatchRow } from "@/lib/types"

export function Admin() {
  const { data: matches } = useMatches()
  const update = useAdminUpdateMatch()
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
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
    return list.slice(0, 60)
  }, [matches, query])

  return (
    <div className="space-y-4">
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

      <div className="space-y-2">
        {filtered.map((m) => (
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
                        payload.home_score != null && payload.away_score != null
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
      </div>
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

  return (
    <Card className="gap-0 py-3">
      <CardHeader className="px-4 pb-2">
        <div className="flex items-center justify-between">
          <StageBadge stage={match.stage} group={match.group_name} />
          <span className="text-xs text-muted-foreground">
            #{match.id} · {dayHeading(match.kickoff)} {kickoffTime(match.kickoff)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex items-center justify-between gap-2">
          <TeamDisplay
            name={match.home_team}
            code={match.home_code}
            size="sm"
            className="flex-1"
          />
          <Input
            inputMode="numeric"
            value={home}
            onChange={(e) => setHome(e.target.value.replace(/\D/g, "").slice(0, 2))}
            className="h-9 w-12 text-center"
          />
          <span className="text-muted-foreground">:</span>
          <Input
            inputMode="numeric"
            value={away}
            onChange={(e) => setAway(e.target.value.replace(/\D/g, "").slice(0, 2))}
            className="h-9 w-12 text-center"
          />
          <TeamDisplay
            name={match.away_team}
            code={match.away_code}
            size="sm"
            align="right"
            className="flex-1"
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
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
              variant="outline"
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
      </CardContent>
    </Card>
  )
}
