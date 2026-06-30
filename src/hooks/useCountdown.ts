import { useEffect, useState } from "react"

/** Live milliseconds remaining until `targetIso`, re-rendering once a second so
 *  a seconds-resolution countdown visibly ticks. Ticking stops once `active` is
 *  false or the deadline passes; the returned value is clamped at zero so it
 *  never goes negative. The hook's state is local, so only the countdown's own
 *  subtree re-renders each tick — not the whole card. */
export function useCountdown(targetIso: string, active = true): number {
  const target = new Date(targetIso).getTime()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      setNow(Date.now())
      if (target - Date.now() <= 0) return // final render at zero; caller locks
      timer = setTimeout(tick, 1_000)
    }
    tick()
    return () => clearTimeout(timer)
  }, [target, active])

  return Math.max(0, target - now)
}

/** Whole minutes elapsed since `sinceIso`, re-rendering every second so a live
 *  match's elapsed clock visibly ticks up. This is wall-clock based — we don't
 *  sync the official match minute — so it counts the time since kickoff and
 *  drifts from the true clock by halftime and stoppage. Clamped at zero. Like
 *  `useCountdown`, the state is local so only the small label re-renders. */
export function useElapsedMinutes(sinceIso: string, active = true): number {
  const since = new Date(sinceIso).getTime()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(timer)
  }, [active])

  return Math.max(0, Math.floor((now - since) / 60_000))
}
