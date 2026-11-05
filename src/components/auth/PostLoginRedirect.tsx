import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { pickPendingVisionPath, type PendingParticipantRow } from '../../lib/postLogin'
import { LoadingScreen } from '../shared/LoadingScreen'

// Where a freshly signed-in person lands: straight into the vision
// questionnaire they still owe, otherwise their team list. A lookup failure
// must never get in the way of signing in, so any error just falls back.
export function PostLoginRedirect() {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['post-login-destination', user?.id],
    queryFn: async (): Promise<string | null> => {
      if (!supabase || !user) return null
      const { data: rows, error } = await supabase
        .from('session_participants')
        .select('session_id, convergence_sessions(id, team_id, session_type, status, created_at)')
        .eq('user_id', user.id)
        .is('submitted_at', null)
      if (error) return null
      return pickPendingVisionPath(rows as unknown as PendingParticipantRow[])
    },
    enabled: !!user,
    // Recomputed on every sign-in, never served from an earlier visit.
    gcTime: 0,
    staleTime: 0,
  })

  if (isLoading) return <LoadingScreen />
  return <Navigate to={data ?? '/teams'} replace />
}
