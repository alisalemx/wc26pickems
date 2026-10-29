/** How a list's content arrives on screen.
 *  - "cascade": a first load, using the caller's own slide-up entrance
 *    (usually staggered via .stagger-in).
 *  - "fade": a quick fade with no movement, for a repeated switch made with a
 *    pointer (another day, view, stage filter, or tab).
 *  - "none": a switch made with the arrow keys, which can change tabs several
 *    times a second; keyboard actions don't animate. */
export type Entrance = "cascade" | "fade" | "none"

/** The entrance for content shown by a switch, from how the switch was made. */
export function switchEntrance(keyboard: boolean): Entrance {
  return keyboard ? "none" : "fade"
}

const QUICK_FADE =
  "animate-in fade-in-0 animation-duration-[var(--duration-fast)] ease-out-cubic"

/** The classes for `entrance`, where `cascade` is the caller's first-load
 *  entrance classes. */
export function entranceClasses(entrance: Entrance, cascade: string): string {
  if (entrance === "cascade") return cascade
  return entrance === "fade" ? QUICK_FADE : ""
}
