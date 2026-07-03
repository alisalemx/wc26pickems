import type { MatchStage, ResultType } from "./types"

/**
 * Stage point multipliers. Must stay in sync with the Postgres
 * `stage_multiplier()` function in supabase/migrations/0001_init.sql —
 * the database is the source of truth for actual scoring; this copy is
 * for display only ("worth up to N pts").
 */
export const STAGE_MULTIPLIER: Record<MatchStage, number> = {
  GROUP: 1,
  R32: 1,
  R16: 2,
  QF: 2,
  SF: 3,
  THIRD: 2,
  FINAL: 4,
}

export const EXACT_BASE = 3
export const OUTCOME_BASE = 1

export const STAGE_LABEL: Record<MatchStage, string> = {
  GROUP: "Group",
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-final",
  SF: "Semi-final",
  THIRD: "Third place",
  FINAL: "Final",
}

export const STAGE_SHORT: Record<MatchStage, string> = {
  GROUP: "Groups",
  R32: "R32",
  R16: "R16",
  QF: "QF",
  SF: "SF",
  THIRD: "3rd",
  FINAL: "Final",
}

export const KNOCKOUT_STAGES: MatchStage[] = [
  "R32",
  "R16",
  "QF",
  "SF",
  "THIRD",
  "FINAL",
]

export function maxPoints(stage: MatchStage): number {
  return EXACT_BASE * STAGE_MULTIPLIER[stage]
}

/** Max points a player could still add: the exact-score value of every match
 *  not yet played to a final result (upcoming or in progress). Uses the same
 *  finished test as the rest of the app. Display-only, like everything here. */
export function remainingMaxPoints(
  matches: {
    stage: MatchStage
    status: string
    home_score: number | null
    away_score: number | null
  }[]
): number {
  return matches.reduce((sum, m) => {
    const isFinished =
      m.status === "FINISHED" && m.home_score != null && m.away_score != null
    return isFinished ? sum : sum + maxPoints(m.stage)
  }, 0)
}

const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0)

/**
 * Classic scoring, mirrored from the SQL: exact 90'+ET score = 3×mult,
 * correct outcome (W/D/L) = 1×mult, otherwise 0. Penalties never count.
 * Used client-side only to preview/label points; the leaderboard total
 * always comes from the database view.
 */
export function scorePrediction(
  stage: MatchStage,
  homePred: number,
  awayPred: number,
  homeScore: number,
  awayScore: number
): { points: number; result: ResultType } {
  const mult = STAGE_MULTIPLIER[stage]
  if (homePred === homeScore && awayPred === awayScore) {
    return { points: EXACT_BASE * mult, result: "EXACT" }
  }
  if (sign(homePred - awayPred) === sign(homeScore - awayScore)) {
    return { points: OUTCOME_BASE * mult, result: "OUTCOME" }
  }
  return { points: 0, result: "MISS" }
}
