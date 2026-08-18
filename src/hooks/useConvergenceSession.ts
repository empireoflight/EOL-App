import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { ConvergenceSession, SessionParticipant } from '../lib/types'
import { isReadinessGateMet, type SessionStatus } from '../lib/sessionStateMachine'

export type ParticipantWithIdentity = SessionParticipant & {
  name?: string
}

export type ConvergenceSessionData = {
  session: ConvergenceSession
  participants: SessionParticipant[]
  submittedCount: number
  totalParticipants: number
  gateMet: boolean
  /**
   * Participant names — only ever populated for vision sessions. Friction
   * sessions must only ever expose a count (spec §16: "never who has or
   * hasn't submitted for friction sessions"), so this stays empty for them
   * even once Phase 2 builds friction sessions on the same hook.
   */
  participantNames: Record<string, string>
}

async function fetchSession(sessionId: string): Promise<ConvergenceSessionData> {
  if (!supabase) throw new Error('Supabase is not configured')

  const { data: session, error: sessionError } = await supabase
    .from('convergence_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()
  if (sessionError) throw sessionError

  const { data: participants, error: participantsError } = await supabase
    .from('session_participants')
    .select('*')
    .eq('session_id', sessionId)
  if (participantsError) throw participantsError

  let participantNames: Record<string, string> = {}
  if (session.session_type === 'vision' && participants.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, name')
      .in('id', participants.map((p) => p.user_id))
    participantNames = Object.fromEntries((users ?? []).map((u) => [u.id, u.name]))
  }

  const submittedCount = participants.filter((p) => p.submitted_at).length

  return {
    session: session as ConvergenceSession,
    participants,
    submittedCount,
    totalParticipants: participants.length,
    gateMet: isReadinessGateMet(session.readiness_gate, submittedCount, participants.length),
    participantNames,
  }
}

export function useConvergenceSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['convergence-session', sessionId],
    queryFn: () => fetchSession(sessionId as string),
    enabled: !!sessionId,
  })
}

// Friction hub listing — RLS ("Participants read their friction sessions")
// scopes this to sessions the current user is actually a participant of,
// not every team member (20260814160000_scope_friction_to_participants.sql
// — a friction session raised with specific people must not be visible to
// anyone outside that group). Topic/type in `framing` is fine to surface
// here for the people this query does return: the hub is showing that a
// friction point exists and roughly what it's about, not the tier-0/tier-4
// content gated elsewhere in the flow.
export function useTeamFrictionSessions(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-friction-sessions', teamId],
    queryFn: async (): Promise<ConvergenceSession[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('convergence_sessions')
        .select('*')
        .eq('team_id', teamId as string)
        .eq('session_type', 'friction')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!teamId,
  })
}

// Surfaces "you have a vision reflection to complete" — the missing link
// for a teammate who joined the team after a session was already created.
// Two plain sequential queries rather than an embedded-resource filter,
// matching the rest of this file's style.
export function useMyPendingVisionSession(teamId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['my-pending-vision-session', teamId, user?.id],
    queryFn: async (): Promise<ConvergenceSession | null> => {
      if (!supabase || !user) throw new Error('Not ready')
      const { data: sessions, error: sessionsError } = await supabase
        .from('convergence_sessions')
        .select('*')
        .eq('team_id', teamId as string)
        .eq('session_type', 'vision')
        .neq('status', 'closed')
      if (sessionsError) throw sessionsError
      if (!sessions?.length) return null

      const { data: myRows, error: participantsError } = await supabase
        .from('session_participants')
        .select('session_id, submitted_at')
        .eq('user_id', user.id)
        .in('session_id', sessions.map((s) => s.id))
      if (participantsError) throw participantsError

      const pending = myRows?.find((p) => !p.submitted_at)
      return sessions.find((s) => s.id === pending?.session_id) ?? null
    },
    enabled: !!teamId && !!user,
  })
}

// Surfaces "you've been included in a friction conversation" — the same
// discovery gap vision had (see useMyPendingVisionSession above): nothing
// else in the app tells someone they were added to a friction session, so
// without this the only way to find out is to happen to open the Friction
// hub. RLS now scopes this query to sessions the user actually participates
// in, so no extra filtering is needed here beyond "not yet submitted."
export function useMyPendingFrictionSession(teamId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['my-pending-friction-session', teamId, user?.id],
    queryFn: async (): Promise<ConvergenceSession | null> => {
      if (!supabase || !user) throw new Error('Not ready')
      const { data: sessions, error: sessionsError } = await supabase
        .from('convergence_sessions')
        .select('*')
        .eq('team_id', teamId as string)
        .eq('session_type', 'friction')
        .neq('status', 'closed')
      if (sessionsError) throw sessionsError
      if (!sessions?.length) return null

      const { data: myRows, error: participantsError } = await supabase
        .from('session_participants')
        .select('session_id, submitted_at')
        .eq('user_id', user.id)
        .in('session_id', sessions.map((s) => s.id))
      if (participantsError) throw participantsError

      const pending = myRows?.find((p) => !p.submitted_at)
      return sessions.find((s) => s.id === pending?.session_id) ?? null
    },
    enabled: !!teamId && !!user,
  })
}

// Returns the team's currently open vision session, if any — a session that
// isn't closed and whose vision (if generated yet) hasn't been committed.
// Used to stop a second "Start a vision session" click from spawning a
// parallel, redundant session while one is already in progress: this was
// the actual cause of "it's having us all start over" (a real incident —
// a teammate had a valid pending reflection on the existing session but
// hit "Start a vision session" instead, creating a second, empty one).
export function useOpenVisionSession(teamId: string | undefined) {
  return useQuery({
    queryKey: ['open-vision-session', teamId],
    queryFn: async (): Promise<ConvergenceSession | null> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data: sessions, error: sessionsError } = await supabase
        .from('convergence_sessions')
        .select('*')
        .eq('team_id', teamId as string)
        .eq('session_type', 'vision')
        .neq('status', 'closed')
        .order('created_at', { ascending: false })
      if (sessionsError) throw sessionsError
      if (!sessions?.length) return null

      const { data: visions, error: visionsError } = await supabase
        .from('visions')
        .select('session_id, status')
        .in('session_id', sessions.map((s) => s.id))
      if (visionsError) throw visionsError
      const committedSessionIds = new Set((visions ?? []).filter((v) => v.status === 'committed').map((v) => v.session_id))

      return sessions.find((s) => !committedSessionIds.has(s.id)) ?? null
    },
    enabled: !!teamId,
  })
}

/** Polls while synthesis is running — a deliberate, scoped use of refetchInterval,
 *  distinct from the refetchOnWindowFocus culprit disabled globally (spec §17). */
export function useSynthesisJobPolling(sessionId: string | undefined, status: SessionStatus | undefined) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['synthesis-job', sessionId],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('synthesis_jobs')
        .select('*')
        .eq('session_id', sessionId as string)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      if (data?.status === 'succeeded' || data?.status === 'failed') {
        queryClient.invalidateQueries({ queryKey: ['convergence-session', sessionId] })
      }
      return data
    },
    enabled: !!sessionId && status === 'synthesizing',
    refetchInterval: (query) => {
      const job = query.state.data
      return job?.status === 'queued' || job?.status === 'running' ? 2000 : false
    },
  })
}
