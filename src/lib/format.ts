/** Date / time helpers, all rendered in the viewer's local timezone. */

export function kickoffTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
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
