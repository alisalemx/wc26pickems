export type MatchStage =
  | "GROUP"
  | "R32"
  | "R16"
  | "QF"
  | "SF"
  | "THIRD"
  | "FINAL"

export type MatchStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "POSTPONED"
  | "CANCELLED"

export interface MatchRow {
  id: number
  fd_id: number | null
  stage: MatchStage
  group_name: string | null
  matchday: number | null
  home_team: string | null
  away_team: string | null
  home_code: string | null
  away_code: string | null
  kickoff: string
  venue: string | null
  status: MatchStatus
  home_score: number | null
  away_score: number | null
  home_pens: number | null
  away_pens: number | null
  duration: string
  updated_at: string
}

export interface PredictionRow {
  user_id: string
  match_id: number
  home_pred: number
  away_pred: number
  updated_at: string
}

export interface Profile {
  id: string
  username: string
  is_admin: boolean
  created_at: string
}

export interface LeaderboardRow {
  user_id: string
  username: string
  total_points: number
  exact_count: number
  outcome_count: number
  scored_count: number
}

/** A prediction joined with the (now visible) result for a locked match. */
export interface RevealedPrediction {
  match_id: number
  user_id: string
  username: string
  home_pred: number
  away_pred: number
  points: number | null
  result_type: ResultType | null
}

export type ResultType = "EXACT" | "OUTCOME" | "MISS"
