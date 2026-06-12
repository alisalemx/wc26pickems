/** Maps FIFA three-letter codes to ISO-3166 alpha-2 for flag emoji. */
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

const ENGLAND_FLAG = "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}"
const SCOTLAND_FLAG = "🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}"

export function flagEmoji(code: string | null | undefined): string {
  if (!code) return "🏳️"
  const iso = TLA_TO_ISO2[code]
  if (!iso) return "🏳️"
  if (iso === "GB-ENG") return ENGLAND_FLAG
  if (iso === "GB-SCT") return SCOTLAND_FLAG
  return iso
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
}
