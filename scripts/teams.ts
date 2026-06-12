/**
 * 48 nations distributed across the 12 groups (A–L) of the 2026 World Cup.
 *
 * NOTE: group assignments here are a best-effort, illustrative seed so the app
 * is fully functional out of the box. The Netlify sync function and the
 * API-based seed (`seed-matches.ts` with FOOTBALL_DATA_TOKEN) reconcile team
 * names, kickoff times, and fd_ids against official football-data.org data,
 * so any inaccuracy here is corrected automatically once the API is reachable.
 */
export interface Team {
  name: string
  code: string // FIFA/ISO three-letter code, used for flag emoji + display
}

export const GROUPS: Record<string, Team[]> = {
  A: [
    { name: "Mexico", code: "MEX" },
    { name: "South Korea", code: "KOR" },
    { name: "South Africa", code: "RSA" },
    { name: "Norway", code: "NOR" },
  ],
  B: [
    { name: "Canada", code: "CAN" },
    { name: "Croatia", code: "CRO" },
    { name: "Qatar", code: "QAT" },
    { name: "Ecuador", code: "ECU" },
  ],
  C: [
    { name: "United States", code: "USA" },
    { name: "Switzerland", code: "SUI" },
    { name: "Egypt", code: "EGY" },
    { name: "Paraguay", code: "PAR" },
  ],
  D: [
    { name: "Argentina", code: "ARG" },
    { name: "Austria", code: "AUT" },
    { name: "Ivory Coast", code: "CIV" },
    { name: "New Zealand", code: "NZL" },
  ],
  E: [
    { name: "France", code: "FRA" },
    { name: "Senegal", code: "SEN" },
    { name: "Uzbekistan", code: "UZB" },
    { name: "Panama", code: "PAN" },
  ],
  F: [
    { name: "England", code: "ENG" },
    { name: "Denmark", code: "DEN" },
    { name: "Tunisia", code: "TUN" },
    { name: "Costa Rica", code: "CRC" },
  ],
  G: [
    { name: "Brazil", code: "BRA" },
    { name: "Belgium", code: "BEL" },
    { name: "Algeria", code: "ALG" },
    { name: "Jordan", code: "JOR" },
  ],
  H: [
    { name: "Spain", code: "ESP" },
    { name: "Uruguay", code: "URU" },
    { name: "Nigeria", code: "NGA" },
    { name: "Saudi Arabia", code: "KSA" },
  ],
  I: [
    { name: "Portugal", code: "POR" },
    { name: "Colombia", code: "COL" },
    { name: "Cameroon", code: "CMR" },
    { name: "Jamaica", code: "JAM" },
  ],
  J: [
    { name: "Netherlands", code: "NED" },
    { name: "Japan", code: "JPN" },
    { name: "Morocco", code: "MAR" },
    { name: "Scotland", code: "SCO" },
  ],
  K: [
    { name: "Germany", code: "GER" },
    { name: "Australia", code: "AUS" },
    { name: "Ghana", code: "GHA" },
    { name: "Honduras", code: "HON" },
  ],
  L: [
    { name: "Italy", code: "ITA" },
    { name: "Iran", code: "IRN" },
    { name: "Cape Verde", code: "CPV" },
    { name: "Curaçao", code: "CUW" },
  ],
}

export const HOST_CITIES = [
  "Mexico City",
  "Guadalajara",
  "Monterrey",
  "Toronto",
  "Vancouver",
  "Los Angeles",
  "San Francisco Bay Area",
  "Seattle",
  "Kansas City",
  "Dallas",
  "Houston",
  "Atlanta",
  "Miami",
  "New York / New Jersey",
  "Philadelphia",
  "Boston",
]
