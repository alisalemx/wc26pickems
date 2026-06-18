/** Date / time helpers, all rendered in the viewer's local timezone. */

export function kickoffTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Compact kickoff date for tight layouts (e.g. bracket cards): "Jun 17". */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

export function dayHeading(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

/** Like dayHeading but with an abbreviated weekday: "Wed, Jun 17". */
export function shortDayHeading(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export function dayKey(iso: string): string {
  // Group by the viewer's local calendar day.
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`
}

export function isLocked(iso: string, now: number = Date.now()): boolean {
  return new Date(iso).getTime() <= now
}

/** Longest plausible wall-clock span from kickoff to a final result: 90' +
 *  halftime + generous stoppage, plus extra time and penalties for knockouts,
 *  plus slack for the 10-min sync cadence. Comfortably over 3 hours. */
export const MAX_LIVE_MS = 3.5 * 60 * 60 * 1000

/** Whether a match should pulse "LIVE". A match is live once kickoff has passed
 *  and until we record a FINISHED result — we only sync the final score, so the
 *  card can't show a live scoreline, just the label. Critically this is bounded
 *  by `MAX_LIVE_MS`: the upstream feed occasionally leaves a finished match
 *  stuck at IN_PLAY (never flipping to FINISHED), which would otherwise pulse
 *  LIVE forever. Past the window we stop claiming it's live regardless of status. */
export function isLive(
  kickoff: string,
  status: string,
  now: number = Date.now()
): boolean {
  if (status === "FINISHED") return false
  const start = new Date(kickoff).getTime()
  return start <= now && now - start <= MAX_LIVE_MS
}

/** Time remaining until `iso`, measured from `now` (ms since epoch), as a
 *  colon clock counting down to the second. Powers the live countdown on match
 *  cards. Returns null once the deadline has passed — the caller renders a
 *  locked state instead. The leading unit is unpadded; the rest pad to two
 *  digits: "3D 04:12:30", "5:12:30", "8:30", "0:42". */
export function formatCountdown(iso: string, now: number = Date.now()): string | null {
  const ms = new Date(iso).getTime() - now
  if (ms <= 0) return null
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  if (days > 0) return `${days}D ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`
  return `${minutes}:${pad(seconds)}`
}

/** English ordinal for a positive integer: 1 -> "1st", 2 -> "2nd", 3 -> "3rd",
 *  with the 11/12/13 exception ("11th", "12th", "13th"). */
export function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

export function initials(name: string): string {
  const parts = name.split(/[\s_]+/).filter(Boolean)
  // Usernames are single handles (no spaces): take their first two characters.
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return parts
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
