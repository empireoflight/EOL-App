import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { TeamType } from '../lib/teamType'

// Goes through an RPC because teams UPDATE is limited to org admins; the
// function checks the caller is this team's facilitator and touches only this
// one column.
export function useSetTeamType(teamId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (type: TeamType) => {
      if (!supabase || !teamId) throw new Error('Not ready')
      const { error } = await supabase.rpc('set_team_type', { p_team_id: teamId, p_type: type })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] })
      queryClient.invalidateQueries({ queryKey: ['my-teams'] })
    },
  })
}
