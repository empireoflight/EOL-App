import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { TeamInvite, TeamInviteLink } from '../lib/types'

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

// The team's current shareable invite link, if one's been generated — a
// reusable alternative to per-email team_invites (RLS scopes this to
// facilitators/org admins, same as team_invites reads).
export function useTeamInviteLink(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-invite-link', teamId],
    queryFn: async (): Promise<TeamInviteLink | null> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('team_invite_links')
        .select('*')
        .eq('team_id', teamId as string)
        .eq('status', 'active')
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!teamId,
  })
}

// Creates the team's first link, or swaps out the existing one — either way
// leaves exactly one active link, via regenerate_team_invite_link (handles
// "none yet" and "replace the current one" the same way: revoke whatever's
// active, then insert fresh).
export function useRegenerateTeamInviteLink(teamId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!supabase || !teamId) throw new Error('Not ready')
      const { data, error } = await supabase.rpc('regenerate_team_invite_link', { p_team_id: teamId }).single<TeamInviteLink>()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-invite-link', teamId] }),
  })
}
