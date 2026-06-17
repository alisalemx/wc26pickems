import { Bracket } from "@/components/Bracket"
import type { MatchRow, MatchStage, MatchStatus } from "@/lib/types"

/** TEMP /temp-bracket — preview the bracket with mock countries so the layout
 *  can be judged before the tournament resolves teams. Builds fake knockout
 *  matches and passes them straight to Bracket (bypassing the Supabase fetch,
 *  which would overwrite with real — still empty — data). Remove this page
 *  (and its route in App.tsx) when done. */

type Mock = [
  id: number,
  stage: MatchStage,
  kickoff: string,
  home: [string, string] | null, // [code, name]
  away: [string, string] | null,
  hs: number | null,
  as: number | null,
  status: MatchStatus,
  hp?: number | null,
  ap?: number | null,
  duration?: string,
]

const MOCK: Mock[] = [
  // Round of 32
  [73, "R32", "2026-06-28T16:00:00.000Z", ["MEX", "Mexico"], ["CAN", "Canada"], 2, 1, "FINISHED"],
  [74, "R32", "2026-06-28T19:00:00.000Z", ["CRO", "Croatia"], ["QAT", "Qatar"], 3, 0, "FINISHED"],
  [75, "R32", "2026-06-28T22:00:00.000Z", ["NOR", "Norway"], ["ECU", "Ecuador"], 1, 1, "FINISHED", 4, 3, "PENALTY_SHOOTOUT"],
  [76, "R32", "2026-06-29T16:00:00.000Z", ["SUI", "Switzerland"], ["EGY", "Egypt"], 2, 0, "FINISHED"],
  [77, "R32", "2026-06-29T19:00:00.000Z", ["ARG", "Argentina"], ["AUT", "Austria"], 3, 1, "FINISHED"],
  [78, "R32", "2026-06-29T22:00:00.000Z", ["CIV", "Ivory Coast"], ["NZL", "New Zealand"], 2, 2, "FINISHED", 5, 4, "PENALTY_SHOOTOUT"],
  [79, "R32", "2026-06-30T16:00:00.000Z", ["FRA", "France"], ["SEN", "Senegal"], 2, 1, "FINISHED"],
  [80, "R32", "2026-06-30T19:00:00.000Z", ["UZB", "Uzbekistan"], ["PAN", "Panama"], 1, 1, "FINISHED", 4, 5, "PENALTY_SHOOTOUT"],
  [81, "R32", "2026-06-30T22:00:00.000Z", ["ENG", "England"], ["DEN", "Denmark"], 2, 0, "FINISHED"],
  [82, "R32", "2026-07-01T16:00:00.000Z", ["TUN", "Tunisia"], ["CRC", "Costa Rica"], 1, 1, "FINISHED", 4, 2, "PENALTY_SHOOTOUT"],
  [83, "R32", "2026-07-01T19:00:00.000Z", ["BRA", "Brazil"], ["BEL", "Belgium"], 2, 2, "FINISHED", 5, 3, "PENALTY_SHOOTOUT"],
  [84, "R32", "2026-07-01T22:00:00.000Z", ["ALG", "Algeria"], ["JOR", "Jordan"], 1, 0, "FINISHED"],
  [85, "R32", "2026-07-02T16:00:00.000Z", ["ESP", "Spain"], ["URU", "Uruguay"], 2, 1, "FINISHED"],
  [86, "R32", "2026-07-02T19:00:00.000Z", ["NGA", "Nigeria"], ["KSA", "Saudi Arabia"], 1, 1, "FINISHED", 4, 3, "PENALTY_SHOOTOUT"],
  [87, "R32", "2026-07-02T22:00:00.000Z", ["POR", "Portugal"], ["COL", "Colombia"], 2, 0, "FINISHED"],
  [88, "R32", "2026-07-03T16:00:00.000Z", ["CMR", "Cameroon"], ["JAM", "Jamaica"], 1, 1, "FINISHED", 3, 4, "PENALTY_SHOOTOUT"],
  // Round of 16
  [89, "R16", "2026-07-04T16:00:00.000Z", ["CRO", "Croatia"], ["ARG", "Argentina"], 1, 2, "FINISHED"],
  [90, "R16", "2026-07-04T19:00:00.000Z", ["MEX", "Mexico"], ["NOR", "Norway"], 2, 2, "FINISHED", 4, 3, "PENALTY_SHOOTOUT"],
  [91, "R16", "2026-07-05T16:00:00.000Z", ["SUI", "Switzerland"], ["CIV", "Ivory Coast"], 1, 0, "FINISHED"],
  [92, "R16", "2026-07-05T19:00:00.000Z", ["FRA", "France"], ["PAN", "Panama"], 3, 0, "FINISHED"],
  [93, "R16", "2026-07-06T16:00:00.000Z", ["BRA", "Brazil"], ["ALG", "Algeria"], 2, 1, "FINISHED"],
  [94, "R16", "2026-07-06T19:00:00.000Z", ["ENG", "England"], ["TUN", "Tunisia"], 3, 0, "FINISHED"],
  [95, "R16", "2026-07-07T16:00:00.000Z", ["POR", "Portugal"], ["CMR", "Cameroon"], 2, 2, "FINISHED", 5, 4, "PENALTY_SHOOTOUT"],
  [96, "R16", "2026-07-07T19:00:00.000Z", ["ESP", "Spain"], ["NGA", "Nigeria"], 2, 0, "FINISHED"],
  // Quarter-finals
  [97, "QF", "2026-07-09T16:00:00.000Z", ["ARG", "Argentina"], ["MEX", "Mexico"], 2, 1, "FINISHED"],
  [98, "QF", "2026-07-09T19:00:00.000Z", ["BRA", "Brazil"], ["ENG", "England"], 1, 1, "FINISHED", 4, 2, "PENALTY_SHOOTOUT"],
  [99, "QF", "2026-07-10T16:00:00.000Z", ["SUI", "Switzerland"], ["FRA", "France"], 0, 2, "FINISHED"],
  [100, "QF", "2026-07-10T19:00:00.000Z", ["POR", "Portugal"], ["ESP", "Spain"], 1, 1, "FINISHED", 5, 4, "PENALTY_SHOOTOUT"],
  // Semi-finals
  [101, "SF", "2026-07-14T16:00:00.000Z", ["ARG", "Argentina"], ["BRA", "Brazil"], 2, 1, "FINISHED"],
  [102, "SF", "2026-07-15T16:00:00.000Z", ["FRA", "France"], ["POR", "Portugal"], 1, 1, "FINISHED", 4, 5, "PENALTY_SHOOTOUT"],
  // Final + Third
  [103, "THIRD", "2026-07-18T16:00:00.000Z", ["BRA", "Brazil"], ["POR", "Portugal"], null, null, "TIMED"],
  [104, "FINAL", "2026-07-19T16:00:00.000Z", ["ARG", "Argentina"], ["FRA", "France"], null, null, "TIMED"],
]

function toRow(m: Mock): MatchRow {
  const home = m[3]
  const away = m[4]
  return {
    id: m[0],
    fd_id: null,
    stage: m[1],
    group_name: null,
    matchday: null,
    home_team: home ? home[1] : null,
    away_team: away ? away[1] : null,
    home_code: home ? home[0] : null,
    away_code: away ? away[0] : null,
    kickoff: m[2],
    venue: null,
    status: m[7],
    home_score: m[5],
    away_score: m[6],
    home_pens: m[8] ?? null,
    away_pens: m[9] ?? null,
    duration: m[10] ?? "REGULAR",
    result_locked: false,
    updated_at: new Date().toISOString(),
  }
}

export function TempBracket() {
  return <Bracket mockMatches={MOCK.map(toRow)} />
}
