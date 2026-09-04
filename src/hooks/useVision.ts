import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Vision, VisionCommitment } from '../lib/types'

export function useTeamVision(teamId: string | undefined) {
  return useQuery({
    queryKey: ['vision', teamId],
    queryFn: async (): Promise<Vision | null> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('visions')
        .select('*')
        .eq('team_id', teamId as string)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!teamId,
  })
}

export function useVision(visionId: string | undefined) {
  return useQuery({
    queryKey: ['vision-by-id', visionId],
    queryFn: async (): Promise<Vision> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase.from('visions').select('*').eq('id', visionId as string).single()
      if (error) throw error
      return data
    },
    enabled: !!visionId,
  })
}

export function useSaveVisionLayout(visionId: string | undefined, teamId?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (layout: Vision['layout']) => {
      if (!supabase || !visionId) throw new Error('Not ready')
      const { error } = await supabase.from('visions').update({ layout }).eq('id', visionId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vision-by-id', visionId] })
      // VisionHomePage reads via useTeamVision, keyed by teamId, not visionId —
      // without this the edit only shows up after a manual reload.
      if (teamId) queryClient.invalidateQueries({ queryKey: ['vision', teamId] })
    },
  })
}

export function useVisionCommitments(visionId: string | undefined) {
  return useQuery({
    queryKey: ['vision-commitments', visionId],
    queryFn: async (): Promise<VisionCommitment[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase.from('vision_commitments').select('*').eq('vision_id', visionId as string)
      if (error) throw error
      return data
    },
    enabled: !!visionId,
  })
}

// The three lifecycle transitions (send/commit/revise) all cross the
// "co-edit while draft" RLS boundary, so each is a security-definer RPC
// rather than a plain table update — see the migration for why.
function useVisionLifecycleInvalidation(visionId: string | undefined, teamId: string | undefined) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['vision-by-id', visionId] })
    queryClient.invalidateQueries({ queryKey: ['vision-commitments', visionId] })
    if (teamId) queryClient.invalidateQueries({ queryKey: ['vision', teamId] })
  }
}

export function useSendVisionForApproval(visionId: string | undefined, teamId?: string) {
  const invalidate = useVisionLifecycleInvalidation(visionId, teamId)
  return useMutation({
    mutationFn: async () => {
      if (!supabase || !visionId) throw new Error('Not ready')
      const { error } = await supabase.rpc('send_vision_for_approval', { p_vision_id: visionId })
      if (error) throw error
      // Fire-and-forget — the vision is already sent for approval even if
      // the email call fails, same pattern as team invites.
      void supabase.functions.invoke('send-vision-ready-email', { body: { visionId } })
    },
    onSuccess: invalidate,
  })
}

export function useCommitToVision(visionId: string | undefined, teamId?: string) {
  const invalidate = useVisionLifecycleInvalidation(visionId, teamId)
  return useMutation({
    mutationFn: async (note?: string) => {
      if (!supabase || !visionId) throw new Error('Not ready')
      const { error } = await supabase.rpc('commit_to_vision', { p_vision_id: visionId, p_note: note ?? null })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useReviseVision(visionId: string | undefined, teamId?: string) {
  const invalidate = useVisionLifecycleInvalidation(visionId, teamId)
  return useMutation({
    mutationFn: async () => {
      if (!supabase || !visionId) throw new Error('Not ready')
      const { error } = await supabase.rpc('revise_vision', { p_vision_id: visionId })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export type VisionAnswer = {
  userId: string
  userName: string
  userAvatarUrl: string | null
  content: Record<string, string>
}

// Reads private_reflections directly rather than joining to `users` in one
// query — the FK is to auth.users, not public.users, so PostgREST can't
// embed the name; same two-step shape useConvergenceSession.ts's
// fetchSession already uses for the same reason.
export function useVisionAnswers(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['vision-answers', sessionId],
    queryFn: async (): Promise<VisionAnswer[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data: reflections, error: reflectionsError } = await supabase
        .from('private_reflections')
        .select('user_id, content, created_at')
        .eq('session_id', sessionId as string)
        .eq('kind', 'vision_answer')
        .order('created_at', { ascending: true })
      if (reflectionsError) throw reflectionsError
      if (!reflections?.length) return []

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .in('id', reflections.map((r) => r.user_id))
      if (usersError) throw usersError
      const userById = Object.fromEntries((users ?? []).map((u) => [u.id, u]))

      return reflections.map((r) => ({
        userId: r.user_id,
        userName: userById[r.user_id]?.name ?? 'Someone',
        userAvatarUrl: userById[r.user_id]?.avatar_url ?? null,
        content: r.content as Record<string, string>,
      }))
    },
    enabled: !!sessionId,
  })
}
