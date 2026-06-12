import { useState } from "react"
import { useNavigate } from "react-router-dom"
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

// Reached via the password-recovery email link. Supabase establishes a
// temporary session from the link (detectSessionInUrl), so the protected
// route lets us in and updateUser() can set a new password.
export function ResetPassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [password, setPassword] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await updatePassword(password)
      toast.success("Password updated — you're all set.")
      navigate("/")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>Choose a new password</CardTitle>
            <CardDescription>Enter a new password for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="np-pw">New password</Label>
                <Input
                  id="np-pw"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
