import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { hasAnyAnswer, resolveProfileQuestions } from '../lib/teamProfiles'
import type { ProfileQuestion, TeamProfile, TeamProfileMatch, TeamProfileQuestions } from '../lib/types'

// null = the facilitator never customized anything (built-in defaults apply).
function useSavedProfileQuestions(teamId: string | undefined) {
  return useQuery({
    queryKey: ['profile-questions', teamId],
    queryFn: async (): Promise<TeamProfileQuestions | null> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase.from('team_profile_questions').select('*').eq('team_id', teamId as string).maybeSingle()
      if (error) throw error
      return data as TeamProfileQuestions | null
    },
    enabled: !!teamId,
  })
}

export function useProfileQuestions(teamId: string | undefined) {
  const { data, isLoading } = useSavedProfileQuestions(teamId)
  return { questions: resolveProfileQuestions(data?.questions), updatedAt: data?.updated_at ?? null, isLoading }
}

export function useSaveProfileQuestions(teamId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (questions: ProfileQuestion[]) => {
      if (!supabase || !teamId) throw new Error('Not ready')
      const { error } = await supabase.from('team_profile_questions').upsert({ team_id: teamId, questions }, { onConflict: 'team_id' })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile-questions', teamId] }),
  })
}

// Selects name + avatar only, never email — a bulletin board card has no
// business showing a teammate's address.
export function useTeamProfiles(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-profiles', teamId],
    queryFn: async (): Promise<TeamProfile[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('team_member_profiles')
        .select('*, users(id, name, avatar_url)')
        .eq('team_id', teamId as string)
      if (error) throw error
      return data as unknown as TeamProfile[]
    },
    enabled: !!teamId,
  })
}

export function useSaveMyProfile(teamId: string | undefined) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (answers: Record<string, string>) => {
      if (!supabase || !teamId || !user) throw new Error('Not ready')
      const { error } = await supabase
        .from('team_member_profiles')
        .upsert({ team_id: teamId, user_id: user.id, answers }, { onConflict: 'team_id,user_id' })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-profiles', teamId] }),
  })
}

export function useMyProfileMatches(teamId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['profile-matches', teamId, user?.id],
    queryFn: async (): Promise<TeamProfileMatch[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase.from('team_profile_matches').select('*').eq('team_id', teamId as string).eq('viewer_id', user!.id)
      if (error) throw error
      return data
    },
    enabled: !!teamId && !!user?.id,
  })
}

// Asks the edge function to (re)rank everyone for the viewer, at most once
// per mount and only when what's stored is missing or older than the newest
// profile/question edit. The function hashes its own inputs and skips the AI
// call when nothing relevant changed, so a spurious invoke is cheap.
export function useRefreshMatches({
  teamId,
  profiles,
  matches,
  questionsUpdatedAt,
  ready,
}: {
  teamId: string | undefined
  profiles: TeamProfile[] | undefined
  matches: TeamProfileMatch[] | undefined
  questionsUpdatedAt: string | null
  ready: boolean
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const attempted = useRef(false)

  const refresh = useMutation({
    mutationFn: async () => {
      if (!supabase || !teamId) throw new Error('Not ready')
      const { data: authData } = await supabase.auth.getSession()
      const { error } = await supabase.functions.invoke('match-team-profiles', {
        body: { teamId },
        headers: { Authorization: `Bearer ${authData.session?.access_token}` },
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile-matches', teamId, user?.id] }),
  })

  const answered = (profiles ?? []).filter(hasAnyAnswer)
  const viewerHasAnswers = answered.some((p) => p.user_id === user?.id)
  const othersAnswered = answered.some((p) => p.user_id !== user?.id)
  const newestInput = [...answered.map((p) => p.updated_at), ...(questionsUpdatedAt ? [questionsUpdatedAt] : [])].sort().at(-1)
  const oldestMatch = (matches ?? []).map((m) => m.computed_at).sort().at(0)
  const stale = !oldestMatch || (!!newestInput && newestInput > oldestMatch)

  const { mutate } = refresh
  useEffect(() => {
    if (!ready || attempted.current || !viewerHasAnswers || !othersAnswered || !stale) return
    attempted.current = true
    mutate()
  }, [ready, viewerHasAnswers, othersAnswered, stale, mutate])

  return { refreshing: refresh.isPending, failed: refresh.isError }
}
