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

/** Longest plausible wall-clock span from kickoff to a final result, used to
 *  bound the LIVE label (see `isLive`). Group games end at 90' (no extra time or
 *  penalties), so they're shorter than knockout/bracket games. Both budgets:
 *  90' + halftime + generous stoppage, and for the bracket also extra time and
 *  penalties — plus slack for the 10-min sync cadence. */
export const MAX_LIVE_MS_GROUP = 2.5 * 60 * 60 * 1000 // ~90'+HT+stoppage+slack
export const MAX_LIVE_MS_BRACKET = 3.5 * 60 * 60 * 1000 // + extra time + penalties

/** Whether a match should pulse "LIVE". A match is live only once the synced
 *  feed reports it actually underway (`IN_PLAY`/`PAUSED`), never merely because
 *  the wall clock passed the *scheduled* kickoff — real kickoffs slip (delays,
 *  ceremonies) and the feed keeps such a match `TIMED`, so a purely time-based
 *  check would falsely pulse LIVE (and show a fake elapsed minute) before it
 *  starts. Still bounded by a per-stage window: the upstream feed occasionally
 *  leaves a finished match stuck at IN_PLAY (never flipping to FINISHED), which
 *  would otherwise pulse LIVE forever. Group games use a shorter window than the
 *  bracket, which can run to extra time and penalties. Past the window we stop
 *  claiming it's live. Trade-off: because status is only refreshed each sync
 *  (~2 min), the LIVE pulse can lag the real kickoff by up to that cadence —
 *  acceptable, and strictly better than falsely flagging a delayed match. */
export function isLive(
  kickoff: string,
  status: string,
  stage: string,
  now: number = Date.now()
): boolean {
  if (status !== "IN_PLAY" && status !== "PAUSED") return false
  const start = new Date(kickoff).getTime()
  const window = stage === "GROUP" ? MAX_LIVE_MS_GROUP : MAX_LIVE_MS_BRACKET
  return start <= now && now - start <= window
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

/** The leading integer of ESPN's match-clock string ("67'" -> 67) — the minute
 *  to anchor a ticking seconds clock on. Returns null when it isn't a clean
 *  minute we can tick from: "HT", a stoppage clock ("45'+2'"), an empty/garbage
 *  value, or null. */
export function parseClockMinute(minute: string | null): number | null {
  if (!minute) return null
  const m = /^(\d+)'?$/.exec(minute.trim())
  return m ? Number(m[1]) : null
}

/** Whole seconds as a stopwatch clock "M:SS" — single-digit minutes unpadded,
 *  seconds always two digits: 7 -> "0:07", 67 -> "1:07", 4023 -> "67:03". */
export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
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
