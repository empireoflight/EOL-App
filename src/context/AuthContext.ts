import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export type Profile = {
  id: string
  email: string
  name: string
  created_at: string
}

export type AuthContextValue = {
  session: Session | null | undefined
  user: User | null
  profile: Profile | null
  loading: boolean
  profileLoading: boolean
  signUp: (args: { email: string; password: string; name: string; redirectPath?: string }) => Promise<{ session: Session | null }>
  signIn: (args: { email: string; password: string }) => Promise<unknown>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
