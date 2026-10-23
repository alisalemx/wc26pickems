import { useMemo, useState } from "react"
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  CalendarDays,
  Network,
  Trophy,
  User,
  LogOut,
  type LucideIcon,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useMatches } from "@/hooks/queries"
import { tournamentChampion } from "@/lib/bracket"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { GoogleIcon } from "@/components/GoogleIcon"
import { cn } from "@/lib/utils"

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

// Every page but Me is public (read-only for visitors); Me only appears once
// signed in, since it's the viewer's own picks.
const MATCHES_NAV: NavItem = { to: "/", label: "Matches", icon: CalendarDays, end: true }
const TOURNAMENT_NAV: NavItem = { to: "/tournament", label: "Tournament", icon: Network }
const LEADERBOARD_NAV: NavItem = { to: "/leaderboard", label: "Leaderboard", icon: Trophy }
const ME_NAV: NavItem = { to: "/me", label: "Me", icon: User }

const LIVE_NAV: NavItem[] = [MATCHES_NAV, TOURNAMENT_NAV, LEADERBOARD_NAV]
// Once the tournament is over the final standings are the main event, so the
// Leaderboard moves up to second place.
const FINALE_NAV: NavItem[] = [MATCHES_NAV, LEADERBOARD_NAV, TOURNAMENT_NAV]

/** The logo mark: a turf-green pitch with its halfway line, centre circle, and
 *  penalty boxes drawn in the signal’s dark ink. The favicon and app icons in
 *  public/ redraw it as a square tile. */
function PitchMark() {
  return (
    <svg viewBox="0 0 36 26" className="h-[26px] w-9 shrink-0" aria-hidden>
      <rect width="36" height="26" rx="6" className="fill-signal" />
      <g fill="none" strokeWidth={1.5} className="stroke-signal-foreground">
        <path d="M18 0v26" />
        <circle cx="18" cy="13" r="5" />
        <path d="M0 7.5h5v11H0M36 7.5h-5v11h5" />
      </g>
    </svg>
  )
}

/** The logo: the pitch mark beside the two-tone Signage wordmark, the name in
 *  ink over "Pick’ems" in grey. */
function Wordmark() {
  return (
    <Link
      to="/"
      aria-label="WC26 Pick’ems, home"
      className="-mx-1.5 flex shrink-0 items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors duration-[var(--duration-fast)] active:bg-foreground/10"
    >
      <PitchMark />
      <span className="flex flex-col text-[15px] leading-[1.05] font-bold tracking-tight">
        <span>WC26</span>
        <span className="text-quiet">Pick’ems</span>
      </span>
    </Link>
  )
}

export function Layout() {
  const { session, profile, loading, signOut, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [signingIn, setSigningIn] = useState(false)

  async function handleSignIn() {
    setSigningIn(true)
    try {
      // Redirects away on success, so no navigate() here.
      await signInWithGoogle()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed")
      setSigningIn(false)
    }
  }

  const { data: matches } = useMatches()
  const over = useMemo(
    () => tournamentChampion(matches ?? []) != null,
    [matches]
  )
  const items: NavItem[] = [
    ...(over ? FINALE_NAV : LIVE_NAV),
    ...(session ? [ME_NAV] : []),
  ]

  return (
    <div className="flex min-h-dvh flex-col">
      {/* The floating top bar: a frosted pill inset from the edges, so the page
          shows around it as it scrolls. The sticky wrapper is click-through
          (only the pill takes input), and shares `main`'s width and gutters so
          the pill's edges line up with the cards. Its height (gap + bar) is
          --header-h in index.css; the sticky day strip parks just below it.
          Paddings keep the pill's controls concentric with its rounded ends. */}
      <header
        data-app-header
        className="pointer-events-none sticky top-0 z-(--z-header) mx-auto w-full max-w-6xl px-3 pt-3 sm:px-6"
      >
        <div className="pointer-events-auto flex h-14 items-center gap-8 rounded-full bg-bar pr-3 pl-6 backdrop-blur-xl backdrop-saturate-150">
          <Wordmark />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex h-9 items-center rounded-full px-4 text-sm font-semibold transition-colors duration-[var(--duration-fast)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent-pressed"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            {loading ? (
              // Hold the auth area with a skeleton until getSession() resolves,
              // so "Sign in" doesn't flash before a restored session loads.
              // Sized like the sign-in button so it doesn't shift.
              <Skeleton className="h-8 w-24 rounded-full" aria-hidden />
            ) : session ? (
              <>
                {profile && (
                  <span className="max-w-40 truncate px-2 text-sm font-semibold tracking-tight">
                    @{profile.username}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  aria-label="Sign out"
                  onClick={async () => {
                    try {
                      await signOut()
                      navigate("/")
                    } catch (err) {
                      toast.error(
                        err instanceof Error ? err.message : "Sign out failed"
                      )
                    }
                  }}
                >
                  <LogOut />
                </Button>
              </>
            ) : (
              <Button size="sm" disabled={signingIn} onClick={handleSignIn}>
                <GoogleIcon />
                {over ? "Sign in" : "Sign in to play"}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 pt-4 pb-10 sm:px-6 sm:pt-6">
        <Outlet />
      </main>

      {/* The personal sign-off. Clears the floating tab bar on phones. */}
      <footer className="mx-auto flex w-full max-w-6xl justify-center px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] text-sm text-muted-foreground sm:px-6 md:pb-10">
        <p>
          Made by{" "}
          <a
            href="https://fluffypixel.ca"
            className="-mx-1 rounded-sm px-1 font-semibold text-foreground underline decoration-1 underline-offset-4 hover:decoration-2 active:bg-foreground/10"
          >
            Fluffy Pixel
          </a>
        </p>
      </footer>

      {/* Phones only: the floating tab bar, a frosted pill matching the top bar
          and inset from the edges and the home indicator (desktop navigates from
          the header). `transform-gpu` (translateZ(0)) forces the fixed bar onto its own GPU
          compositing layer. Without it, mobile Safari recomputes a plain
          `position: fixed` bar's spot against the layout viewport mid-scroll
          (URL-bar show/hide, momentum scroll) and it intermittently detaches and
          floats over content; a promoted layer is composited independently of the
          scroll, so it stays glued to the bottom. The `env(safe-area-inset-bottom)`
          offset only resolves once the viewport meta opts in with `viewport-fit=cover`. */}
      <nav
        aria-label="Main"
        data-tab-bar
        className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-(--z-header) mx-auto max-w-lg transform-gpu rounded-full bg-bar px-1.5 backdrop-blur-xl backdrop-saturate-150 md:hidden"
      >
        <div className="flex">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "group flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-[var(--duration-fast)] focus-visible:outline-none",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground active:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "grid h-7 w-12 place-items-center rounded-full transition-colors duration-[var(--duration-fast)] group-focus-visible:ring-2 group-focus-visible:ring-ring",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "group-active:bg-foreground/10"
                    )}
                  >
                    <item.icon className="size-[18px]" aria-hidden />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
