import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Goes through an RPC because teams UPDATE is limited to org admins; the
// function checks the caller is this team's facilitator and touches only this
// one column.
export function useSetTeamReminders(teamId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!supabase || !teamId) throw new Error('Not ready')
      const { error } = await supabase.rpc('set_team_reminders_enabled', { p_team_id: teamId, p_enabled: enabled })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] })
      queryClient.invalidateQueries({ queryKey: ['my-teams'] })
    },
  })
}
