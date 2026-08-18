import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useUserName(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-name', userId],
    queryFn: async (): Promise<string | null> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase.from('users').select('name').eq('id', userId as string).maybeSingle()
      if (error) throw error
      return data?.name ?? null
    },
    enabled: !!userId,
  })
}
