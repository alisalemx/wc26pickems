import { useLayoutEffect } from "react"
import { useLocation } from "react-router-dom"

/**
 * Resets the window to the top on every pathname change. The shell uses a single
 * window scroll shared across all tab routes (see Layout), so without this the
 * scroll offset bleeds from one tab to the next — tap a tab while scrolled down
 * and the next page opens mid-scroll. Keyed on pathname only, so query/hash
 * changes within a page don't yank the user back to the top. Runs in a layout
 * effect (before paint) to avoid a flash of the new page at the old offset.
 */
export function ScrollToTop() {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
