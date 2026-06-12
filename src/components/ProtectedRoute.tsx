import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Skeleton } from "@/components/ui/skeleton"

export function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
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
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  // Not signed in: public page, let it render.
  if (!session) return <Outlet />

  // Signed in but the profile row is still loading.
  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (!profile.username_chosen) return <Navigate to="/welcome" replace />
  return <Outlet />
}

export function AdminRoute() {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile?.is_admin) return <Navigate to="/" replace />
  return <Outlet />
}
