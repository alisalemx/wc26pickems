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
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  /** Returns true if a session started immediately, false if email
   *  confirmation is required (no session yet). */
  signUp: (
    email: string,
    password: string,
    username: string
  ) => Promise<boolean>
  signInWithGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  setUsername: (username: string) => Promise<void>
  isUsernameAvailable: (username: string) => Promise<boolean>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()
    setProfile((data as Profile) ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) {
        loadProfile(data.session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
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

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUp = async (
    email: string,
    password: string,
    username: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${window.location.origin}/`,
      },
    })
    if (error) throw error
    // When "Confirm email" is on, signUp returns a user but no session.
    return Boolean(data.session)
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) throw error
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset`,
    })
    if (error) throw error
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
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
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        resetPassword,
        updatePassword,
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
