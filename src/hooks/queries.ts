import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type {
  LeaderboardRow,
  MatchRow,
  PredictionDistributionRow,
  PredictionRow,
  RevealedPrediction,
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

/** Anonymous crowd distribution of scorelines for a match — counts only, no
 *  user identity, so it's safe to show before kickoff (see the
 *  `prediction_distribution` RPC). Rows arrive most-picked first. */
export function usePredictionDistribution(matchId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["prediction-distribution", matchId],
    enabled,
    queryFn: async (): Promise<PredictionDistributionRow[]> => {
      const { data, error } = await supabase.rpc("prediction_distribution", {
        p_match_id: matchId,
      })
      if (error) throw error
      return data as PredictionDistributionRow[]
    },
    staleTime: 60_000,
  })
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
