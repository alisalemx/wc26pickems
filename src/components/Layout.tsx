import { useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  CalendarDays,
  Network,
  Trophy,
  User,
  Shield,
  LogOut,
  type LucideIcon,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { GoogleIcon } from "@/components/GoogleIcon"
import { cn } from "@/lib/utils"

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

// Matches and the Tournament view (group tables + knockout bracket) are public;
// Leaderboard and Me only appear once signed in (tapping Leaderboard while logged
// out still routes to /login via ProtectedRoute, but we keep the bar uncluttered
// for visitors).
const PUBLIC_NAV: NavItem[] = [
  { to: "/", label: "Matches", icon: CalendarDays, end: true },
  { to: "/tournament", label: "Tournament", icon: Network },
]
const MEMBER_NAV: NavItem[] = [
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/me", label: "Me", icon: User },
]

export function Layout() {
  const { session, profile, signOut, signInWithGoogle } = useAuth()
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

  const items: NavItem[] = [
    ...PUBLIC_NAV,
    ...(session ? MEMBER_NAV : []),
    ...(profile?.is_admin
      ? [{ to: "/admin", label: "Admin", icon: Shield }]
      : []),
  ]

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-ink bg-background px-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">WC26 Pick'ems</p>
            <p className="text-xs text-muted-foreground">Prediction League</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session ? (
            <>
              {profile && (
                <span className="text-sm font-medium tracking-tight">
                  @{profile.username}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
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
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="play-cta"
              disabled={signingIn}
              onClick={handleSignIn}
            >
              <GoogleIcon />
              Sign in to play
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 px-3 pb-24 pt-3 sm:px-4">
        <Outlet />
      </main>

      {/* `transform-gpu` (translateZ(0)) forces the fixed bar onto its own GPU
          compositing layer. Without it, mobile Safari recomputes a plain
          `position: fixed` bar's spot against the layout viewport mid-scroll
          (URL-bar show/hide, momentum scroll) and it intermittently detaches and
          floats over content; a promoted layer is composited independently of the
          scroll, so it stays glued to the bottom. The `pb-[env(safe-area-inset-bottom)]`
          only resolves once the viewport meta opts in with `viewport-fit=cover`. */}
      <nav className="fixed inset-x-0 bottom-0 z-20 transform-gpu border-t border-ink bg-background">
        <div className="mx-auto flex max-w-2xl pb-[env(safe-area-inset-bottom)]">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={"end" in item ? item.end : false}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition-colors active:bg-foreground/10",
                  isActive
                    ? "font-semibold text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <item.icon className="size-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
