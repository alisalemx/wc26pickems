import { useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { AuthShell } from "@/components/AuthShell"

// Keep in sync with the username_format check in 0001_init.sql.
const USERNAME_RE = /^[a-z0-9_]{3,20}$/

// First-run handle picker for users who signed in without choosing one
// (i.e. Google OAuth — they get an email-derived handle to start). Email/
// password users already picked at sign-up and never see this.
export function Welcome() {
  const { profile, setUsername, isUsernameAvailable } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [username, setUsernameInput] = useState(profile?.username ?? "")

  // Already chosen (or hit directly) — nothing to do here.
  if (profile?.username_chosen) return <Navigate to="/" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!USERNAME_RE.test(username)) {
      toast.error("Username must be 3–20 chars: lowercase letters, numbers, _")
      return
    }
    setBusy(true)
    try {
      // Skip the taken-check only when it's unchanged from our suggestion.
      if (
        username !== profile?.username &&
        !(await isUsernameAvailable(username))
      ) {
        toast.error(`@${username} is taken — try another`)
        return
      }
      await setUsername(username)
      toast.success(`You're @${username} — let's play.`)
      navigate("/")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save username")
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Pick your handle"
      subtitle="This is how you'll show up on the leaderboard."
    >
      <Card>
        <CardHeader>
          <CardTitle>Choose a username</CardTitle>
          <CardDescription>Make it count — this is your identity in the league.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="wc-name">Username</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">@</span>
                <Input
                  id="wc-name"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) =>
                    setUsernameInput(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_]/g, "")
                        .slice(0, 20)
                    )
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                3–20 characters: lowercase letters, numbers, underscore.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  )
}
