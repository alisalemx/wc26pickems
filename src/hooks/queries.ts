import { useMemo } from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import {
  computeTournamentForm,
  computeTournamentResults,
  computeUpcomingMatches,
} from "@/lib/form"
import type { TournamentResult } from "@/lib/form"
import type {
  GroupStandingRow,
  LeaderboardRow,
  MatchRow,
  PredictionDistributionRow,
  PredictionRow,
  RevealedPrediction,
  TeamFormRow,
} from "@/lib/types"

export function useMatches() {
  return useQuery({
    queryKey: ["matches"],
    queryFn: async (): Promise<MatchRow[]> => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .order("kickoff", { ascending: true })
        .order("id", { ascending: true })
      if (error) throw error
      return data as MatchRow[]
    },
    refetchInterval: 60_000,
  })
}

/** Official group standings synced from football-data (see 0013_standings.sql).
 *  We render football-data's `position` order because it applies FIFA's
 *  fair-play tiebreaker we can't compute from match results alone. Publicly
 *  readable and polled like matches; the Groups tab falls back to a client-side
 *  table when this is empty (before the first sync, or offline in dev). */
export function useStandings() {
  return useQuery({
    queryKey: ["standings"],
    queryFn: async (): Promise<GroupStandingRow[]> => {
      const { data, error } = await supabase
        .from("standings")
        .select("*")
        .order("group_name", { ascending: true })
        .order("position", { ascending: true })
      if (error) throw error
      return data as GroupStandingRow[]
    },
    refetchInterval: 60_000,
  })
}

export function useMyPredictions(userId: string | undefined) {
  return useQuery({
    queryKey: ["predictions", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Record<number, PredictionRow>> => {
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", userId!)
      if (error) throw error
      const map: Record<number, PredictionRow> = {}
      for (const row of data as PredictionRow[]) map[row.match_id] = row
      return map
    },
  })
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async (): Promise<LeaderboardRow[]> => {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .order("total_points", { ascending: false })
        .order("exact_count", { ascending: false })
      if (error) throw error
      return data as LeaderboardRow[]
    },
    refetchInterval: 60_000,
  })
}

/** Everyone's predictions for a single match — only returns rows the RLS
 *  policy allows (i.e. after kickoff, plus always your own). */
export function useRevealedPredictions(matchId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["revealed", matchId],
    enabled,
    queryFn: async (): Promise<RevealedPrediction[]> => {
      const { data, error } = await supabase
        .from("predictions")
        .select("match_id, user_id, home_pred, away_pred, profiles(username)")
        .eq("match_id", matchId)
      if (error) throw error
      // Points are computed client-side via the scored view shape; we fetch the
      // scored rows separately to keep this query simple.
      return (data as unknown as RawRevealed[]).map((r) => {
        // PostgREST returns the joined relation as an object or single-element
        // array depending on the embed; normalise both shapes.
        const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
        return {
          match_id: r.match_id,
          user_id: r.user_id,
          username: prof?.username ?? "player",
          home_pred: r.home_pred,
          away_pred: r.away_pred,
          points: null,
          result_type: null,
        }
      })
    },
  })
}

/** Crowd distribution for ALL upcoming matches in one RPC call. Every
 *  PopularPicks subscribes to the same query key, so ~100 cards share a
 *  single request; `select` picks out this card's match. */
export function usePredictionDistribution(matchId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["prediction-distributions"],
    enabled,
    queryFn: async (): Promise<PredictionDistributionRow[]> => {
      const { data, error } = await supabase.rpc("prediction_distributions")
      if (error) throw error
      return data as PredictionDistributionRow[]
    },
    select: (rows) => rows.filter((r) => r.match_id === matchId),
    staleTime: 60_000,
    // Crowd sentiment shifts as other players predict, so poll like the other
    // live feeds. All PopularPicks share one query key → one RPC per 60s.
    refetchInterval: 60_000,
  })
}

/** Recent form for every team, in one tiny query keyed by football-data TLA.
 *  Like usePredictionDistribution, all ~100 match cards share this single
 *  request; each looks up its two teams by `home_code`/`away_code`. Form only
 *  changes when a team plays (roughly daily at most), so it's cached an hour.
 *  Public-readable, so it resolves for logged-out visitors too. */
export function useTeamForm() {
  return useQuery({
    queryKey: ["team-form"],
    queryFn: async (): Promise<TeamFormRow[]> => {
      const { data, error } = await supabase.from("team_form").select("*")
      if (error) throw error
      return data as TeamFormRow[]
    },
    select: (rows) =>
      Object.fromEntries(rows.map((r) => [r.code, r])) as Record<string, TeamFormRow>,
    staleTime: 60 * 60_000,
  })
}

/** Each team's in-tournament W/D/L, derived from the shared `matches` query
 *  (no extra request) and memoised per render. Keyed by team code; pairs with
 *  useTeamForm (the frozen pre-tournament half) in MatchCard. */
export function useTournamentForm(): Record<string, string> {
  const { data } = useMatches()
  return useMemo(() => computeTournamentForm(data ?? []), [data])
}

/** Each team's detailed in-tournament results (for the team-info modal),
 *  derived from the shared `matches` query and memoised. Keyed by team code. */
export function useTournamentResults(): Record<string, TournamentResult[]> {
  const { data } = useMatches()
  return useMemo(() => computeTournamentResults(data ?? []), [data])
}

/** Each team's upcoming (not-yet-kicked-off) World Cup matches, derived from the
 *  shared `matches` query and memoised. Keyed by team code. */
export function useUpcomingMatches(): Record<string, MatchRow[]> {
  const { data } = useMatches()
  return useMemo(() => computeUpcomingMatches(data ?? []), [data])
}

interface RawRevealed {
  match_id: number
  user_id: string
  home_pred: number
  away_pred: number
  profiles: { username: string } | { username: string }[] | null
}

export function useUpsertPrediction(userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      matchId: number
      homePred: number
      awayPred: number
    }) => {
      if (!userId) throw new Error("Not signed in")
      const { error } = await supabase.from("predictions").upsert(
        {
          user_id: userId,
          match_id: vars.matchId,
          home_pred: vars.homePred,
          away_pred: vars.awayPred,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,match_id" }
      )
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["predictions", userId] })
      qc.invalidateQueries({ queryKey: ["prediction-distributions"] })
    },
  })
}

export function useAdminUpdateMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      id: number
      home_score: number | null
      away_score: number | null
      status: string
      home_pens?: number | null
      away_pens?: number | null
      duration?: string
      result_locked?: boolean
    }) => {
      const { id, ...rest } = vars
      const { error } = await supabase
        .from("matches")
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] })
      qc.invalidateQueries({ queryKey: ["leaderboard"] })
    },
  })
}
