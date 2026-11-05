import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LoadingScreen } from '../shared/LoadingScreen'
import { PostLoginRedirect } from './PostLoginRedirect'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

// Signed-in visitors to /login or /signup are sent on: back to the page that
// bounced them here if there was one (an explicit link wins), otherwise to
// wherever they should land after signing in (see PostLoginRedirect).
export function GuestRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (session) {
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname
    return from ? <Navigate to={from} replace /> : <PostLoginRedirect />
  }
  return children
}
