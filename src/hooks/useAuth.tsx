import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import type { Profile } from "@/lib/types"

interface AuthState {
  session: Session | null
  profile: Profile | null
  profileError: boolean
  loading: boolean
  signInWithGoogle: () => Promise<void>
  setUsername: (username: string) => Promise<void>
  isUsernameAvailable: (username: string) => Promise<boolean>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle()
      if (error) throw error
      setProfile((data as Profile) ?? null)
      setProfileError(false)
    } catch (err) {
      // Surface the failure instead of swallowing it: a network error here used
      // to leave a signed-in user on a perpetual skeleton with no recovery.
      // Keep any already-loaded profile and flag the error so the UI can retry.
      console.error("Failed to load profile", err)
      setProfileError(true)
    }
  }

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session)
        if (data.session) {
          loadProfile(data.session.user.id).finally(() => setLoading(false))
        } else {
          setLoading(false)
        }
      })
      .catch((err) => {
        // Corrupt local storage / SDK error: degrade to logged-out rather than
        // hang on the loading skeleton forever.
        console.error("getSession failed", err)
        setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
      if (sess) {
        loadProfile(sess.user.id)
      } else {
        setProfile(null)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) throw error
  }

  const setUsername = async (username: string) => {
    const { error } = await supabase.rpc("set_username", { name: username })
    if (error) throw error
    if (session) await loadProfile(session.user.id)
  }

  const isUsernameAvailable = async (username: string) => {
    const { data, error } = await supabase.rpc("username_available", {
      name: username,
    })
    if (error) throw error
    return data as boolean
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const refreshProfile = async () => {
    if (session) await loadProfile(session.user.id)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        profileError,
        loading,
        signInWithGoogle,
        setUsername,
        isUsernameAvailable,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
