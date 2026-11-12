import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { PersonalFrictionGuide } from '../lib/types'

// Owner-only by RLS, so no user filter is needed beyond the team. A failure
// here (e.g. the table isn't on this project yet) is swallowed into "no
// guides" rather than breaking the Unlearn page that lists them.
export function useMyPersonalGuides(teamId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['personal-friction-guides', teamId, user?.id],
    queryFn: async (): Promise<PersonalFrictionGuide[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('personal_friction_guides')
        .select('*')
        .eq('team_id', teamId as string)
        .order('created_at', { ascending: false })
      if (error) return []
      return data as unknown as PersonalFrictionGuide[]
    },
    enabled: !!teamId && !!user?.id,
  })
}

export function usePersonalGuide(guideId: string | undefined) {
  return useQuery({
    queryKey: ['personal-friction-guide', guideId],
    queryFn: async (): Promise<PersonalFrictionGuide | null> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase.from('personal_friction_guides').select('*').eq('id', guideId as string).maybeSingle()
      if (error) throw error
      return data as unknown as PersonalFrictionGuide | null
    },
    enabled: !!guideId,
  })
}

export function useDeletePersonalGuide(teamId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (guideId: string) => {
      if (!supabase) throw new Error('Not ready')
      const { error } = await supabase.from('personal_friction_guides').delete().eq('id', guideId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['personal-friction-guides', teamId] }),
  })
}
