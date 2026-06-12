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
import { AuthShell } from "@/components/AuthShell"
import { GoogleIcon } from "@/components/GoogleIcon"
import { AlertTriangle } from "lucide-react"

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
    <AuthShell
      title="WC26 Pick'ems"
      subtitle="Predict every match. Top the table."
    >
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
    </AuthShell>
  )
}
