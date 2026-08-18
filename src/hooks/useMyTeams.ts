import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Team } from '../lib/types'

export function useMyTeams() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['my-teams', user?.id],
    queryFn: async (): Promise<Team[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('team_members')
        .select('teams(*)')
        .eq('user_id', user!.id)
      if (error) throw error
      return (data ?? []).map((row) => row.teams).filter(Boolean) as unknown as Team[]
    },
    enabled: !!user?.id,
  })
}

export function useTeam(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team', teamId],
    queryFn: async (): Promise<Team> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase.from('teams').select('*').eq('id', teamId as string).single()
      if (error) throw error
      return data
    },
    enabled: !!teamId,
  })
}

export function useTeamMembers(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('team_members')
        .select('*, users(id, name, email)')
        .eq('team_id', teamId as string)
      if (error) throw error
      return data
    },
    enabled: !!teamId,
  })
}
