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

// Gate that holds users at /welcome until they've deliberately chosen a handle
// (OAuth sign-ups start with an auto-generated one). Sits inside ProtectedRoute
// so a session is guaranteed; /welcome itself lives outside this gate.
export function RequireUsername() {
  const { profile } = useAuth()

  // Session is set but the profile row is still loading.
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
