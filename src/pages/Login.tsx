import { useState } from "react"
import { useNavigate } from "react-router-dom"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, MailCheck } from "lucide-react"

// Keep in sync with the username_format check in 0001_init.sql.
const USERNAME_RE = /^[a-z0-9_]{3,20}$/

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
  const {
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,
    isUsernameAvailable,
  } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  // When email confirmation is required, signUp returns no session; we show a
  // "check your inbox" state instead of redirecting into a protected route.
  const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null)
  const [forgot, setForgot] = useState(false)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await signIn(email, password)
      navigate("/")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed")
    } finally {
      setBusy(false)
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!USERNAME_RE.test(username)) {
      toast.error("Username must be 3–20 chars: lowercase letters, numbers, _")
      return
    }
    setBusy(true)
    try {
      if (!(await isUsernameAvailable(username))) {
        toast.error(`@${username} is taken — try another`)
        return
      }
      const started = await signUp(email, password, username)
      if (started) {
        toast.success("Account created — you're in!")
        navigate("/")
      } else {
        setConfirmSentTo(email)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up failed")
    } finally {
      setBusy(false)
    }
  }

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

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await resetPassword(email)
      toast.success("If that email has an account, a reset link is on its way.")
      setForgot(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email")
    } finally {
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

        {confirmSentTo ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MailCheck className="size-5 text-primary" />
                Confirm your email
              </CardTitle>
              <CardDescription>
                We sent a confirmation link to <strong>{confirmSentTo}</strong>.
                Click it to activate your account, then sign in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setConfirmSentTo(null)}
              >
                Back to sign in
              </Button>
            </CardContent>
          </Card>
        ) : forgot ? (
          <Card>
            <CardHeader>
              <CardTitle>Reset your password</CardTitle>
              <CardDescription>
                Enter your email and we'll send you a reset link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleForgot}>
                <div className="space-y-1.5">
                  <Label htmlFor="fp-email">Email</Label>
                  <Input
                    id="fp-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  Send reset link
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setForgot(false)}
                >
                  Back
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Join the league</CardTitle>
              <CardDescription>
                Sign in or create an account to start predicting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Sign up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form className="mt-4 space-y-3" onSubmit={handleSignIn}>
                    <div className="space-y-1.5">
                      <Label htmlFor="si-email">Email</Label>
                      <Input
                        id="si-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="si-pw">Password</Label>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setForgot(true)}
                        >
                          Forgot?
                        </button>
                      </div>
                      <Input
                        id="si-pw"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      Sign in
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form className="mt-4 space-y-3" onSubmit={handleSignUp}>
                    <div className="space-y-1.5">
                      <Label htmlFor="su-name">Username</Label>
                      <Input
                        id="su-name"
                        autoComplete="username"
                        placeholder="shown as @you on the leaderboard"
                        required
                        value={username}
                        onChange={(e) =>
                          setUsername(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9_]/g, "")
                              .slice(0, 20)
                          )
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        3–20 characters: lowercase letters, numbers, underscore.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="su-email">Email</Label>
                      <Input
                        id="su-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="su-pw">Password</Label>
                      <Input
                        id="su-pw"
                        type="password"
                        autoComplete="new-password"
                        minLength={6}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      Create account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
