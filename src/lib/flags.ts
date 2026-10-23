/** Maps three-letter team codes (football-data.org `tla`) to the ISO-3166
 *  alpha-2 code (or the GB subdivision code) that names each flag file. */
const TLA_TO_ISO2: Record<string, string> = {
  MEX: "MX", KOR: "KR", RSA: "ZA", NOR: "NO",
  CAN: "CA", CRO: "HR", QAT: "QA", ECU: "EC",
  USA: "US", SUI: "CH", EGY: "EG", PAR: "PY",
  ARG: "AR", AUT: "AT", CIV: "CI", NZL: "NZ",
  FRA: "FR", SEN: "SN", UZB: "UZ", PAN: "PA",
  ENG: "GB-ENG", DEN: "DK", TUN: "TN", CRC: "CR",
  BRA: "BR", BEL: "BE", ALG: "DZ", JOR: "JO",
  ESP: "ES", URU: "UY", NGA: "NG", KSA: "SA",
  POR: "PT", COL: "CO", CMR: "CM", JAM: "JM",
  NED: "NL", JPN: "JP", MAR: "MA", SCO: "GB-SCT",
  GER: "DE", AUS: "AU", GHA: "GH", HON: "HN",
  ITA: "IT", IRN: "IR", CPV: "CV", CUW: "CW",
  BIH: "BA", COD: "CD", CUR: "CW", CZE: "CZ",
  HAI: "HT", IRQ: "IQ", SWE: "SE", TUR: "TR",
  URY: "UY",
}

// Square flag art from `flag-icons`, cropped to a circle by <Flag>. Only the
// teams above are bundled: Vite resolves the brace list at build time, so the
// other ~220 flags in the package never ship. Keep this list in step with
// TLA_TO_ISO2 (flags.test.ts fails if a team's file is missing).
const FILES = import.meta.glob<string>(
  "/node_modules/flag-icons/flags/1x1/{mx,kr,za,no,ca,hr,qa,ec,us,ch,eg,py,ar,at,ci,nz,fr,sn,uz,pa,gb-eng,dk,tn,cr,br,be,dz,jo,es,uy,ng,sa,pt,co,cm,jm,nl,jp,ma,gb-sct,de,au,gh,hn,it,ir,cv,cw,ba,cd,cz,ht,iq,se,tr}.svg",
  { eager: true, query: "?url", import: "default" }
)

const URL_BY_ISO: Record<string, string> = Object.fromEntries(
  Object.entries(FILES).map(([path, url]) => [
    path.slice(path.lastIndexOf("/") + 1, -4).toUpperCase(),
    url,
  ])
)

/** URL of a team's flag image, or null for an unknown or undecided team. */
export function flagUrl(code: string | null | undefined): string | null {
  if (!code) return null
  const iso = TLA_TO_ISO2[code]
  return iso ? (URL_BY_ISO[iso] ?? null) : null
}

/** Every team code we know a flag for (used by the flag test). */
export const KNOWN_TEAM_CODES = Object.keys(TLA_TO_ISO2)
