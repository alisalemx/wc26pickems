/** Shared football-data.org mapping helpers used by the seed script. */

export type Stage = "GROUP" | "R32" | "R16" | "QF" | "SF" | "THIRD" | "FINAL"

export interface MatchUpsert {
  id: number
  fd_id: number | null
  stage: Stage
  group_name: string | null
  matchday: number | null
  home_team: string | null
  away_team: string | null
  home_code: string | null
  away_code: string | null
  kickoff: string
  venue: string | null
  status: string
}

/** Maps a football-data.org `stage` value to our match_stage enum. */
export function mapApiStage(apiStage: string): Stage {
  switch (apiStage) {
    case "GROUP_STAGE":
      return "GROUP"
    case "LAST_32":
    case "ROUND_OF_32":
      return "R32"
    case "LAST_16":
    case "ROUND_OF_16":
      return "R16"
    case "QUARTER_FINALS":
      return "QF"
    case "SEMI_FINALS":
      return "SF"
    case "THIRD_PLACE":
      return "THIRD"
    case "FINAL":
      return "FINAL"
    default:
      // Fail loud rather than silently mapping an unknown stage to GROUP (×1).
      throw new Error(`Unknown football-data stage: ${apiStage}`)
  }
}
