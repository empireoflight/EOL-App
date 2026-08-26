import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getWeekStart } from '../lib/week'

export type WeekCount = { period_start: string; count: number }

function bucketByWeek(dates: (string | null)[]): WeekCount[] {
  const counts = new Map<string, number>()
  for (const d of dates) {
    if (!d) continue
    const week = getWeekStart(new Date(d))
    counts.set(week, (counts.get(week) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([period_start, count]) => ({ period_start, count }))
    .sort((a, b) => (a.period_start < b.period_start ? 1 : -1)) // newest first, matches vibePoints convention
}

/** Tasks (experiments + actions) completed per week, for a team — same
 * query serves team and solo pages, since both are already team-scoped
 * tier-4 data with no member-count-dependent logic. Two sources, same
 * merge pattern as useFrictionProcessedByWeek below. */
export function useCompletedTasksByWeek(teamId: string | undefined) {
  return useQuery({
    queryKey: ['completed-tasks-by-week', teamId],
    queryFn: async (): Promise<WeekCount[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const [experiments, actions] = await Promise.all([
        supabase.from('experiments').select('completed_at').eq('team_id', teamId as string).not('completed_at', 'is', null),
        supabase.from('actions').select('completed_at').eq('team_id', teamId as string).not('completed_at', 'is', null),
      ])
      if (experiments.error) throw experiments.error
      if (actions.error) throw actions.error
      return bucketByWeek([...experiments.data.map((row) => row.completed_at), ...actions.data.map((row) => row.completed_at)])
    },
    enabled: !!teamId,
  })
}

/** Friction sessions processed per week, for a team. Two sources, both
 * privacy-safe to combine: (a) convergence_sessions that reached
 * discussed/closed — already team-visible tier-4 data; (b) the caller's own
 * friction_grounding_completions rows — owner-only RLS means this query
 * only ever returns the current user's own private-grounding completions,
 * never aggregated across teammates. */
export function useFrictionProcessedByWeek(teamId: string | undefined) {
  return useQuery({
    queryKey: ['friction-processed-by-week', teamId],
    queryFn: async (): Promise<WeekCount[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const [sessions, groundings] = await Promise.all([
        supabase
          .from('convergence_sessions')
          .select('updated_at')
          .eq('team_id', teamId as string)
          .eq('session_type', 'friction')
          .in('status', ['discussed', 'closed']),
        supabase.from('friction_grounding_completions').select('completed_at').eq('team_id', teamId as string),
      ])
      if (sessions.error) throw sessions.error
      if (groundings.error) throw groundings.error
      return bucketByWeek([...sessions.data.map((row) => row.updated_at), ...groundings.data.map((row) => row.completed_at)])
    },
    enabled: !!teamId,
  })
}

export type CompletedItem = { id: string; title: string; type: 'action' | 'experiment'; completed_at: string; assignee_id: string | null }

/** The actual rows behind one week's slice of useCompletedTasksByWeek —
 * used by the Evolve page's click-a-week drill-down, which needs titles,
 * not just a count. Same [gte, lte] week-range math the aggregate-weekly-
 * pulse edge function uses for its own completed-task count. */
export function useCompletedItemsForWeek(teamId: string | undefined, periodStart: string | null) {
  return useQuery({
    queryKey: ['completed-items-for-week', teamId, periodStart],
    queryFn: async (): Promise<CompletedItem[]> => {
      if (!supabase || !periodStart) throw new Error('Not ready')
      const periodEnd = new Date(`${periodStart}T00:00:00Z`)
      periodEnd.setUTCDate(periodEnd.getUTCDate() + 6)
      const gte = periodStart
      const lte = `${periodEnd.toISOString().slice(0, 10)}T23:59:59.999Z`
      const [experiments, actions] = await Promise.all([
        supabase.from('experiments').select('id, title, completed_at, assignee_id').eq('team_id', teamId as string).gte('completed_at', gte).lte('completed_at', lte),
        supabase.from('actions').select('id, title, completed_at, assignee_id').eq('team_id', teamId as string).gte('completed_at', gte).lte('completed_at', lte),
      ])
      if (experiments.error) throw experiments.error
      if (actions.error) throw actions.error
      return [
        ...experiments.data.map((r): CompletedItem => ({ ...r, type: 'experiment' })),
        ...actions.data.map((r): CompletedItem => ({ ...r, type: 'action' })),
      ].sort((a, b) => (a.completed_at < b.completed_at ? 1 : -1))
    },
    enabled: !!teamId && !!periodStart,
  })
}

/** Solo-only: the caller's own weekly vibe score, read directly from
 * pulse_vibe_scores rather than team_signals — team_signals' n>=3
 * contributor gate can never fire for a team of one, per
 * 20260812090000_solo_mode_docs.sql. Owner-only RLS already scopes this to
 * the caller's own rows. */
export function useMyVibeScoresByWeek(teamId: string | undefined) {
  return useQuery({
    queryKey: ['my-vibe-scores-by-week', teamId],
    queryFn: async (): Promise<WeekCount[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('pulse_vibe_scores')
        .select('week_of, score')
        .eq('team_id', teamId as string)
        .order('week_of', { ascending: false })
      if (error) throw error
      return data.map((row) => ({ period_start: row.week_of, count: row.score }))
    },
    enabled: !!teamId,
  })
}
