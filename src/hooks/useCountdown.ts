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
