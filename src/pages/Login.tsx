import { useState } from "react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { hasSupabaseConfig } from "@/lib/supabase"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}

export function Login() {
  const { signInWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)

  async function handleGoogle() {
    setBusy(true)
    try {
      // Redirects away on success, so no navigate() here.
      await signInWithGoogle()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed")
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-5xl">🏆</div>
          <h1 className="mt-2 text-2xl font-bold">World Cup 2026</h1>
          <p className="text-muted-foreground">Predict every match. Top the table.</p>
        </div>

        {!hasSupabaseConfig && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Backend not configured</AlertTitle>
            <AlertDescription>
              Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then reload.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Join the league</CardTitle>
            <CardDescription>
              Sign in with Google to start predicting.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={handleGoogle}
            >
              <GoogleIcon />
              Continue with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
