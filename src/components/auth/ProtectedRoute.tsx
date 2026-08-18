import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LoadingScreen } from '../shared/LoadingScreen'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (session) return <Navigate to="/teams" replace />
  return children
}
