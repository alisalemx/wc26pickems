import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

export function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}

// Holds a *signed-in* user at /welcome until they've deliberately chosen a
// handle (OAuth sign-ups start with an auto-generated one). Anonymous visitors
// pass straight through — the public pages (Matches, Groups) sit behind this
// gate, and login is enforced separately by ProtectedRoute on the routes that
// need it.
export function RequireUsername() {
  const { session, profile, profileError, loading, refreshProfile } = useAuth()

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  // Not signed in: public page, let it render.
  if (!session) return <Outlet />

  // Signed in but the profile row is still loading.
  if (!profile) {
    // A profile-load failure used to hang here on the skeleton forever; offer
    // a retry instead.
    if (profileError) {
      return (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            We couldn't load your profile. Check your connection and try again.
          </p>
          <Button onClick={() => void refreshProfile()}>Try again</Button>
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  if (!profile.username_chosen) return <Navigate to="/welcome" replace />
  return <Outlet />
}

export function AdminRoute() {
  const { profile, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }
  if (!profile?.is_admin) return <Navigate to="/" replace />
  return <Outlet />
}
