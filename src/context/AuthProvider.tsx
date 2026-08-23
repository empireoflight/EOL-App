import { useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { AuthContext, type Profile } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  // Lazily derive the "not configured" case at init time instead of via a
  // synchronous setState in an effect body — session starts `undefined`
  // (loading) only when there's a real session to go fetch.
  const [session, setSession] = useState<Session | null | undefined>(() =>
    isSupabaseConfigured ? undefined : null
  )
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  // Tracks which user id `profile` was last fetched for, so "loading" can be
  // derived (fetchedForUserId !== user.id) instead of toggled with its own
  // setState call at the top of the effect.
  const [fetchedForUserId, setFetchedForUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
      })
      .catch(() => {
        setSession(null)
        setUser(null)
      })

    // Per spec §17: TOKEN_REFRESHED fires on tab focus and must be handled
    // idempotently — it must not read as a fresh sign-in and remount forms
    // downstream. We still record the refreshed session (new token), but we
    // reuse the existing `user` object when the id hasn't changed, so effects
    // that key off `user` by reference don't re-run on every tab focus.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)

      if (event === 'TOKEN_REFRESHED') {
        setUser((prev) => (prev && prev.id === newSession?.user?.id ? prev : newSession?.user ?? null))
        return
      }

      setUser(newSession?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured || !supabase) return

    let cancelled = false
    const userId = user.id
    const client = supabase

    // signUp() inserts the users row itself, but the SIGNED_IN auth event
    // (which sets `user` here, triggering this effect) can fire before that
    // insert lands — a genuine race between two independent code paths, not
    // a query ordering issue. maybeSingle() (not single()) avoids erroring
    // on the zero-row case, and a short retry survives the race instead of
    // permanently caching a null profile for the session.
    const fetchProfile = async (attemptsLeft: number): Promise<void> => {
      const { data } = await client.from('users').select('*').eq('id', userId).maybeSingle()
      if (cancelled) return
      if (!data && attemptsLeft > 0) {
        await new Promise((resolve) => setTimeout(resolve, 400))
        if (!cancelled) await fetchProfile(attemptsLeft - 1)
        return
      }
      setProfile(data)
      setFetchedForUserId(userId)
    }

    void fetchProfile(3)

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const signUp = async ({
    email,
    password,
    name,
    redirectPath = '/onboarding',
  }: {
    email: string
    password: string
    name: string
    redirectPath?: string
  }) => {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured')
    // The public.users profile row is created server-side by the
    // handle_new_user() trigger on auth.users, not here — signUp() may
    // return with no active session yet (email confirmation required), so
    // a client-side insert right after this call has no JWT to
    // authenticate with and hits RLS. See migration 20260818040000.
    //
    // emailRedirectTo sends the confirmation link straight to where the
    // user was headed (the invite they were accepting, or onboarding for a
    // plain signup) instead of the bare Site URL — detectSessionInUrl
    // (see lib/supabase.ts) picks the session up from the link automatically,
    // so confirming lands them signed in, not back at the login form.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: `${window.location.origin}${redirectPath}` },
    })
    if (error) throw error
    return data
  }

  const signIn = async ({ email, password }: { email: string; password: string }) => {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setProfile(null)
  }

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) throw error
  }

  // Only valid with the temporary session established by clicking a
  // recovery-email link (detectSessionInUrl picks up its token automatically,
  // see lib/supabase.ts) — called from ResetPasswordPage after that.
  const updatePassword = async (password: string) => {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }

  const profileLoading = !!user?.id && fetchedForUserId !== user.id
  const loading = session === undefined || profileLoading

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        // No user -> no profile, computed inline rather than via a second
        // setState call so sign-out doesn't need its own effect branch.
        profile: user ? profile : null,
        loading,
        profileLoading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
