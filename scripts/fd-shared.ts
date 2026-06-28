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

/** Official FIFA 2026 knockout match number (73..104) keyed by football-data
 *  match id. football-data's feed carries **no** official 1..104 match number,
 *  and its `id`s are not in bracket order, so knockout fixtures must be pinned to
 *  their official slot explicitly. Numbering them by kickoff time (a naive
 *  chronological sort) scrambles the bracket because FIFA's knockout match
 *  numbers are **not** chronological (e.g. Brazil–Japan kicks off before
 *  Germany–Paraguay yet is officially match 76, not 74). The bracket linkage
 *  (`FEEDERS` in src/components/Bracket.tsx) is keyed by these official numbers,
 *  so a mis-numbered slot makes the wrong winners meet.
 *  Source: openfootball/worldcup `2026--usa/cup_finals.txt` (official schedule),
 *  cross-checked against the live football-data fixtures. */
export const KNOCKOUT_FD_ID_TO_NUMBER: Record<number, number> = {
  // Round of 32
  537417: 73, 537415: 74, 537418: 75, 537423: 76,
  537416: 77, 537424: 78, 537425: 79, 537426: 80,
  537421: 81, 537422: 82, 537419: 83, 537420: 84,
  537429: 85, 537427: 86, 537430: 87, 537428: 88,
  // Round of 16
  537375: 89, 537376: 90, 537377: 91, 537378: 92,
  537379: 93, 537380: 94, 537381: 95, 537382: 96,
  // Quarter-finals
  537383: 97, 537384: 98, 537385: 99, 537386: 100,
  // Semi-finals / third place / final
  537387: 101, 537388: 102, 537389: 103, 537390: 104,
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
