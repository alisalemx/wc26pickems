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
  result_locked: boolean
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
  username_chosen: boolean
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

/** One finished match from a team's perspective, backing a single form pill.
 *  Stored in the `results` jsonb of `team_form` (see 0011_team_form.sql). */
export interface TeamFormMatch {
  date: string
  opponent: string
  gf: number
  ga: number
  outcome: "W" | "D" | "L"
  competition: string
}

/** A national team's recent form, sourced from API-Football by the sync-form
 *  function (football-data.org's free tier has no out-of-tournament matches).
 *  `code` is the football-data TLA, joining to `matches.home_code`/`away_code`;
 *  `api_id` is API-Football's id. `form` is W/D/L oldest -> newest. */
export interface TeamFormRow {
  code: string
  name: string | null
  api_id: number | null
  form: string | null
  results: TeamFormMatch[] | null
  updated_at: string
}

/** One scoreline and how many players predicted it for a match — anonymous
 *  aggregate from the `prediction_distributions` RPC (no user identity).
 *  `predictors` is the match's total predictor count: the RPC truncates to the
 *  top 3 scorelines, so percentages must divide by this, not a sum of rows. */
export interface PredictionDistributionRow {
  match_id: number
  home_pred: number
  away_pred: number
  picks: number
  predictors: number
}
