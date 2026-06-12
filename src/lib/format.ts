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
