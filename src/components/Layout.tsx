import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { CalendarDays, Trophy, User, ListChecks, Shield, LogOut } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"

const NAV = [
  { to: "/", label: "Matches", icon: CalendarDays, end: true },
  { to: "/leaderboard", label: "Table", icon: Trophy },
  { to: "/standings", label: "Groups", icon: ListChecks },
  { to: "/me", label: "Me", icon: User },
]

export function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const items = profile?.is_admin
    ? [...NAV, { to: "/admin", label: "Admin", icon: Shield }]
    : NAV

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">World Cup 2026</p>
            <p className="text-xs text-muted-foreground">Prediction League</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Avatar className="size-8">
            <AvatarFallback>
              {profile ? initials(profile.display_name) : "?"}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            onClick={async () => {
              await signOut()
              navigate("/login")
            }}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 px-3 pb-24 pt-3 sm:px-4">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={"end" in item ? item.end : false}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition-colors",
                  isActive
                    ? "text-primary"
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
