import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { TeamInvite } from '../lib/types'

export function useTeamInvites(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-invites', teamId],
    queryFn: async (): Promise<TeamInvite[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('team_invites')
        .select('*')
        .eq('team_id', teamId as string)
        .eq('status', 'pending')
      if (error) throw error
      return data
    },
    enabled: !!teamId,
  })
}

export type MyPendingInvite = {
  id: string
  team_id: string
  team_name: string
  token: string
  created_at: string
}

// Invites addressed to the current user's own email — surfaced regardless
// of whether they ever opened the exact /invite/:token link (spec gap: a
// person invited by email who just signs up normally would otherwise never
// see it). Scoped server-side to auth.uid()'s own email, not a general read.
export function useMyPendingInvites() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['my-pending-invites', user?.id],
    queryFn: async (): Promise<MyPendingInvite[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase.rpc('get_my_pending_invites')
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })
}
