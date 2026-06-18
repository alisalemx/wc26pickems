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

/** A major senior international trophy a team has won (World Cup, continental
 *  championship, Confederations Cup, Nations League). Static, in `team_form`. */
export interface TeamHonor {
  competition: string
  count: number
  years: number[]
}

/** A national team's static pre-tournament data, keyed by football-data TLA
 *  `code` (joining to `matches.home_code`/`away_code`). `form` is the last-5
 *  W/D/L oldest -> newest, `results` the per-match detail, `honors` the major
 *  trophies won. `api_id`/`name` are vestigial (unused by the UI). */
export interface TeamFormRow {
  code: string
  name: string | null
  api_id: number | null
  form: string | null
  results: TeamFormMatch[] | null
  honors: TeamHonor[] | null
  updated_at: string
}

/** One team's row in the official group standings, synced from football-data's
 *  /standings endpoint into the `standings` table (see 0013_standings.sql).
 *  `position` is football-data's authoritative rank, which applies FIFA's
 *  fair-play tiebreaker we can't compute ourselves. Keyed on the stable
 *  football-data team id; `team_code` is the TLA used for flags. */
export interface GroupStandingRow {
  fd_team_id: number
  group_name: string
  position: number
  team_code: string | null
  team_name: string | null
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  points: number
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
