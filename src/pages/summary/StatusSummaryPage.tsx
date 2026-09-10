import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { getWeekStart } from '../../lib/week'
import { useTeamVision } from '../../hooks/useVision'
import { useTeamMembers } from '../../hooks/useMyTeams'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { TaskTypeBadge } from '../../components/shared/TaskTypeBadge'
import { Avatar } from '../../components/shared/Avatar'
import { LoadingScreen } from '../../components/shared/LoadingScreen'
import type { TeamSignal } from '../../lib/types'

type OpenItem = { id: string; kind: 'experiment' | 'action'; title: string; assignee_id: string | null; due_date: string | null }

function useOpenDoItems(teamId: string | undefined) {
  return useQuery({
    queryKey: ['status-summary-open-items', teamId],
    queryFn: async (): Promise<OpenItem[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const [experiments, actions] = await Promise.all([
        supabase
          .from('experiments')
          .select('id, title, assignee_id, due_date')
          .eq('team_id', teamId as string)
          .in('status', ['not_started', 'in_progress']),
        supabase
          .from('actions')
          .select('id, title, assignee_id, due_date')
          .eq('team_id', teamId as string)
          .in('status', ['not_started', 'in_progress']),
      ])
      if (experiments.error) throw experiments.error
      if (actions.error) throw actions.error
      return [
        ...experiments.data.map((r): OpenItem => ({ ...r, kind: 'experiment' })),
        ...actions.data.map((r): OpenItem => ({ ...r, kind: 'action' })),
      ].sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date < b.due_date ? -1 : 1
      })
    },
    enabled: !!teamId,
  })
}

type FrictionWeekSession = { id: string; status: 'discussed' | 'closed'; topic: string | null; outcome: string | null }

// Same [gte, lte] week-range math the aggregate-weekly-pulse edge function
// uses for its own weekly friction count/outcome extraction — kept in sync
// with that as the canonical definition of "this week" for friction data.
function useFrictionSessionsThisWeek(teamId: string | undefined) {
  const weekStart = getWeekStart()
  return useQuery({
    queryKey: ['status-summary-friction-week', teamId, weekStart],
    queryFn: async (): Promise<FrictionWeekSession[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const periodEnd = new Date(`${weekStart}T00:00:00Z`)
      periodEnd.setUTCDate(periodEnd.getUTCDate() + 6)
      const { data, error } = await supabase
        .from('convergence_sessions')
        .select('id, status, framing')
        .eq('team_id', teamId as string)
        .eq('session_type', 'friction')
        .in('status', ['discussed', 'closed'])
        .gte('updated_at', weekStart)
        .lte('updated_at', `${periodEnd.toISOString().slice(0, 10)}T23:59:59.999Z`)
      if (error) throw error
      return data.map((s) => ({
        id: s.id,
        status: s.status as 'discussed' | 'closed',
        topic: (s.framing as { topic?: string | null } | null)?.topic ?? null,
        outcome: (s.framing as { outcome?: string | null } | null)?.outcome ?? null,
      }))
    },
    enabled: !!teamId,
  })
}

// Distinct query key from TeamRollup's/TeamHomePage's own team_signals
// queries (both already independently named 'team-signals' with different
// filters) — sharing a key across differently-shaped queries would let one
// page's cached result leak into another's.
function useLatestVibeSignals(teamId: string | undefined) {
  return useQuery({
    queryKey: ['status-summary-vibe-signals', teamId],
    queryFn: async (): Promise<TeamSignal[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('team_signals')
        .select('*')
        .eq('team_id', teamId as string)
        .eq('source', 'pulse')
        .order('period_start', { ascending: false })
        .limit(4)
      if (error) throw error
      return data
    },
    enabled: !!teamId,
  })
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return ''
  const d = new Date(`${isoDate}T00:00:00Z`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export default function StatusSummaryPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { data: vision, isLoading: visionLoading } = useTeamVision(teamId)
  const { data: members } = useTeamMembers(teamId)
  const { data: openItems, isLoading: openItemsLoading } = useOpenDoItems(teamId)
  const { data: frictionSessions, isLoading: frictionLoading } = useFrictionSessionsThisWeek(teamId)
  const { data: vibeSignals, isLoading: vibeLoading } = useLatestVibeSignals(teamId)
  const [copied, setCopied] = useState(false)

  if (visionLoading || openItemsLoading || frictionLoading || vibeLoading) return <LoadingScreen />

  const showVision = !!vision && vision.status !== 'draft'
  const northStar = vision?.layout.nodes.find((n) => n.kind === 'north_star')?.text
  const pillars = (vision?.layout.nodes ?? []).filter((n) => n.kind === 'pillar')
  const practices = (vision?.layout.nodes ?? []).filter((n) => n.kind === 'practice')
  const signals = (vision?.layout.nodes ?? []).filter((n) => n.kind === 'signal')

  const memberName = (id: string | null) => members?.find((m) => m.user_id === id)?.users?.name ?? null
  const memberAvatarUrl = (id: string | null) => members?.find((m) => m.user_id === id)?.users?.avatar_url

  const outcomes = (frictionSessions ?? []).filter((s) => s.status === 'closed' && s.outcome)
  const vibeNarrative = vibeSignals?.find((s) => s.signal_type === 'weekly_narrative')
  const vibeAvg = vibeSignals?.find((s) => s.signal_type === 'vibe_avg')
  const narrativeValue = vibeNarrative?.value as { pattern?: string } | undefined
  const vibeAvgValue = vibeAvg?.value as { avg?: number } | undefined

  const handleCopy = async () => {
    const lines: string[] = [`Status summary — ${formatDate(new Date().toISOString().slice(0, 10))}`]

    if (showVision) {
      lines.push('', 'VISION' + (vision!.status === 'pending_commitment' ? ' (pending commitment)' : ' (committed)'))
      if (northStar) lines.push(northStar)
      if (pillars.length) lines.push(`Pillars: ${pillars.map((p) => p.text).join(', ')}`)
      if (practices.length) lines.push('What it means in practice:', ...practices.map((p) => `- ${p.text}`))
      if (signals.length) lines.push("How we'll know:", ...signals.map((s) => `- ${s.text}`))
    }

    lines.push('', 'CURRENT DO LIST')
    if (!openItems?.length) {
      lines.push('Nothing open right now.')
    } else {
      openItems.forEach((item) => {
        const who = memberName(item.assignee_id)
        const due = item.due_date ? ` — due ${formatDate(item.due_date)}` : ''
        lines.push(`- [${item.kind === 'experiment' ? 'Experiment' : 'Action'}] ${item.title}${who ? ` (${who})` : ''}${due}`)
      })
    }

    lines.push('', 'THIS WEEK')
    lines.push(`Friction sessions completed: ${frictionSessions?.length ?? 0}`)
    if (outcomes.length) {
      lines.push('Outcomes logged:', ...outcomes.map((o) => `- ${o.outcome}`))
    } else {
      lines.push('No outcomes logged this week.')
    }

    lines.push('', 'TEAM VIBE')
    if (vibeAvgValue?.avg != null) {
      lines.push(`Week of ${formatDate(vibeAvg!.period_start)}: ${vibeAvgValue.avg.toFixed(1)}/5 average`)
    }
    if (narrativeValue?.pattern) {
      lines.push(narrativeValue.pattern)
    } else if (vibeAvgValue?.avg == null) {
      lines.push('No rollup generated yet.')
    }

    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 print:max-w-none print:px-0">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="m-0 text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            Status summary
          </h1>
          <p className="m-0 mt-1 text-[12.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
            A snapshot to share — as of {formatDate(new Date().toISOString().slice(0, 10))}.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={() => void handleCopy()}>
            {copied ? 'Copied!' : 'Copy as text'}
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* Print-only header — the buttons above are hidden when printing, so
          the printed page still needs its own title and date. */}
      <div className="hidden print:block">
        <h1 className="m-0 text-[20px] font-semibold">Status summary</h1>
        <p className="m-0 mt-1 text-[12px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
          As of {formatDate(new Date().toISOString().slice(0, 10))}
        </p>
      </div>

      {showVision && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="m-0 text-[16px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
              Vision
            </h2>
            <span
              className="rounded-full px-2 py-0.5 text-[10.5px] font-medium"
              style={{ background: 'var(--color-tier2-bg)', color: 'var(--color-tier2-fg)' }}
            >
              {vision!.status === 'committed' ? 'Committed' : 'Pending commitment'}
            </span>
          </div>
          <Card>
            <div className="flex flex-col gap-3.5">
              <div className="text-[16px] leading-snug" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
                {northStar ?? 'No north star set.'}
              </div>
              {pillars.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {pillars.map((p) => (
                    <span
                      key={p.id}
                      className="rounded-full px-2.5 py-1 text-[12px] font-medium"
                      style={{ background: 'var(--color-tier2-bg)', color: 'var(--color-tier2-fg)' }}
                    >
                      {p.text}
                    </span>
                  ))}
                </div>
              )}
              {practices.length > 0 && (
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-text-muted)' }}>
                    What it means in practice
                  </div>
                  <ul className="m-0 flex flex-col gap-1 pl-4 text-[12.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
                    {practices.map((p) => (
                      <li key={p.id}>{p.text}</li>
                    ))}
                  </ul>
                </div>
              )}
              {signals.length > 0 && (
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-text-muted)' }}>
                    How we'll know
                  </div>
                  <ul className="m-0 flex flex-col gap-1 pl-4 text-[12.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
                    {signals.map((s) => (
                      <li key={s.id}>{s.text}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      <div>
        <h2 className="m-0 mb-2 text-[16px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          Current Do list
        </h2>
        <Card>
          {!openItems?.length ? (
            <p className="m-0 text-[13px]" style={{ color: 'var(--color-eol-text-faint)' }}>
              Nothing open right now.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {openItems.map((item) => (
                <div key={`${item.kind}-${item.id}`} className="flex items-center gap-2.5">
                  <TaskTypeBadge type={item.kind} />
                  <div className="min-w-0 flex-1 truncate text-[13px]" style={{ color: 'var(--color-eol-text)' }}>
                    {item.title}
                  </div>
                  {item.due_date && (
                    <div className="shrink-0 text-[11.5px]" style={{ color: 'var(--color-eol-text-muted)' }}>
                      Due {formatDate(item.due_date)}
                    </div>
                  )}
                  {item.assignee_id && <Avatar name={memberName(item.assignee_id) ?? '?'} avatarUrl={memberAvatarUrl(item.assignee_id)} size={22} />}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div>
        <h2 className="m-0 mb-2 text-[16px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          This week
        </h2>
        <div className="flex flex-col gap-3">
          <Card>
            <div className="flex items-baseline gap-2">
              <div className="text-[20px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
                {frictionSessions?.length ?? 0}
              </div>
              <div className="text-[12.5px]" style={{ color: 'var(--color-eol-text-muted)' }}>
                friction session{frictionSessions?.length === 1 ? '' : 's'} completed this week
              </div>
            </div>
          </Card>
          <Card>
            <div className="mb-1.5 text-[12.5px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
              Outcomes logged
            </div>
            {outcomes.length === 0 ? (
              <p className="m-0 text-[13px]" style={{ color: 'var(--color-eol-text-faint)' }}>
                No outcomes logged this week.
              </p>
            ) : (
              <ul className="m-0 flex flex-col gap-1.5 pl-4 text-[12.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
                {outcomes.map((o) => (
                  <li key={o.id}>
                    {o.topic && <span style={{ color: 'var(--color-eol-text-muted)' }}>{o.topic}: </span>}
                    {o.outcome}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div>
        <h2 className="m-0 mb-2 text-[16px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          Team vibe
        </h2>
        <Card>
          {!vibeNarrative && !vibeAvg ? (
            <p className="m-0 text-[13px]" style={{ color: 'var(--color-eol-text-faint)' }}>
              No rollup generated yet — visit Evolve to generate one.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {vibeAvgValue?.avg != null && (
                <div className="flex items-baseline gap-2">
                  <div className="text-[20px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
                    {vibeAvgValue.avg.toFixed(1)}/5
                  </div>
                  <div className="text-[12px]" style={{ color: 'var(--color-eol-text-muted)' }}>
                    week of {formatDate(vibeAvg!.period_start)}
                  </div>
                </div>
              )}
              {narrativeValue?.pattern && (
                <p className="m-0 text-[13px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
                  {narrativeValue.pattern}
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
