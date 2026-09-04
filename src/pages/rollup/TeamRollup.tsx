import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { getWeekStart } from '../../lib/week'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { TierBadge } from '../../components/shared/TierBadge'
import { Avatar } from '../../components/shared/Avatar'
import { TaskTypeBadge } from '../../components/shared/TaskTypeBadge'
import { WeeklyMetricsChart } from '../../components/rollup/WeeklyMetricsChart'
import { useCompletedTasksByWeek, useFrictionProcessedByWeek, useCompletedItemsForWeek } from '../../hooks/useWeeklyCompletions'
import { useTeamMembers } from '../../hooks/useMyTeams'
import type { TeamSignal } from '../../lib/types'

type RollupValue = {
  pattern?: string
  gaveThemes?: string[]
  drainedThemes?: string[]
  visionInsight?: string | null
  trendInsight?: string | null
}

const MAX_BACKFILL_WEEKS = 12

function useTeamSignals(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-signals', teamId],
    queryFn: async (): Promise<TeamSignal[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('team_signals')
        .select('*')
        .eq('team_id', teamId as string)
        .eq('source', 'pulse')
        .order('period_start', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!teamId,
  })
}

function formatShortDate(isoDate: string | null): string {
  if (!isoDate) return ''
  const d = new Date(`${isoDate}T00:00:00Z`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

// Weeks between the most recently processed one and now that have no
// team_signals row yet — a week counts as "processed" if it has either a
// vibe_avg or a weekly_narrative row, since vibe_avg is only written when
// that specific gate passes (aggregate-weekly-pulse writes it conditionally)
// while weekly_narrative is written whenever the broader gate passes at all.
// If nothing's ever been generated, only the current week is offered — there's
// no way to know how far back a team's real history goes.
function computeMissingWeeks(processedWeeks: Set<string>): string[] {
  const currentWeek = getWeekStart()
  if (processedWeeks.size === 0) return [currentWeek]

  const latestProcessed = [...processedWeeks].sort().at(-1) as string
  if (latestProcessed >= currentWeek) return []

  const missing: string[] = []
  const cursor = new Date(`${latestProcessed}T00:00:00Z`)
  cursor.setUTCDate(cursor.getUTCDate() + 7)
  while (cursor.toISOString().slice(0, 10) <= currentWeek && missing.length < MAX_BACKFILL_WEEKS) {
    const week = cursor.toISOString().slice(0, 10)
    if (!processedWeeks.has(week)) missing.push(week)
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }
  return missing
}

export function TeamRollup({ teamId }: { teamId: string }) {
  const queryClient = useQueryClient()
  const { data: signals } = useTeamSignals(teamId)
  const { data: taskCounts } = useCompletedTasksByWeek(teamId)
  const { data: frictionCounts } = useFrictionProcessedByWeek(teamId)
  const { data: members } = useTeamMembers(teamId)
  const [generating, setGenerating] = useState(false)
  const [notice, setNotice] = useState('')

  const narratives = (signals ?? []).filter((s) => s.signal_type === 'weekly_narrative')
  const vibePoints = (signals ?? []).filter((s) => s.signal_type === 'vibe_avg')
  const latest = narratives[0]?.value as RollupValue | undefined

  const processedWeeks = new Set([...narratives, ...vibePoints].map((s) => s.period_start).filter((p): p is string => !!p))
  const missingWeeks = computeMissingWeeks(processedWeeks)

  // Default selection is the most recently completed week — vibePoints is
  // already ordered newest-first, so [0] is that week. Once the user picks
  // a bar, that choice sticks even if new data arrives.
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)
  const effectiveSelected = selectedPeriod ?? vibePoints[0]?.period_start ?? taskCounts?.[0]?.period_start ?? frictionCounts?.[0]?.period_start ?? null
  const selectedVibePoint = vibePoints.find((p) => p.period_start === effectiveSelected)
  const selectedNarrative = narratives.find((n) => n.period_start === effectiveSelected)
  const selectedValue = selectedNarrative?.value as RollupValue | undefined
  const { data: completedItems } = useCompletedItemsForWeek(teamId, effectiveSelected)

  const memberName = (id: string | null) => members?.find((m) => m.user_id === id)?.users?.name ?? null
  const memberAvatarUrl = (id: string | null) => members?.find((m) => m.user_id === id)?.users?.avatar_url

  const handleGenerate = async () => {
    if (!supabase || !teamId) return
    setGenerating(true)
    setNotice('')
    try {
      const { data: authData } = await supabase.auth.getSession()
      const token = authData.session?.access_token
      const weeksToGenerate = missingWeeks.length > 0 ? missingWeeks : [getWeekStart()]

      let succeeded = 0
      let skipped = 0
      let failed = 0
      for (const weekOf of weeksToGenerate) {
        try {
          const { data, error } = await supabase.functions.invoke('aggregate-weekly-pulse', {
            body: { teamId, weekOf },
            headers: { Authorization: `Bearer ${token}` },
          })
          if (error) throw error
          if (data?.reason === 'not_enough_contributors') skipped += 1
          else succeeded += 1
        } catch {
          failed += 1
        }
      }

      queryClient.invalidateQueries({ queryKey: ['team-signals', teamId] })

      if (weeksToGenerate.length === 1 && skipped === 1) {
        // Single-week case (the common one) keeps today's exact wording —
        // no visible change for the normal "generate this week" click.
        setNotice('Needs at least 3 people checked in this week.')
      } else if (skipped > 0 || failed > 0) {
        const parts = [`Generated ${succeeded} rollup${succeeded === 1 ? '' : 's'}.`]
        if (skipped > 0) parts.push(`${skipped} week${skipped === 1 ? '' : 's'} skipped — not enough check-ins.`)
        if (failed > 0) parts.push(`${failed} week${failed === 1 ? '' : 's'} failed to generate.`)
        setNotice(parts.join(' '))
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Couldn't generate the rollup.")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="m-0 text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          What are we learning?
        </h1>
        <Button variant="secondary" onClick={handleGenerate} loading={generating}>
          {missingWeeks.length > 1 ? `Generate ${missingWeeks.length} missing rollups` : "Generate this week's rollup"}
        </Button>
      </div>

      {notice && (
        <div className="rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-border-strong)', color: 'var(--color-eol-text-secondary)' }}>
          {notice}
        </div>
      )}

      {latest?.trendInsight && (
        <div
          className="flex flex-col gap-2 rounded-2xl border p-4"
          style={{ background: 'var(--color-tier2-bg)', borderColor: 'var(--color-eol-border)' }}
        >
          <p className="m-0 text-[13px] leading-relaxed" style={{ color: 'var(--color-tier2-fg)' }}>
            {latest.trendInsight}
          </p>
          <div className="flex gap-4 text-[12.5px] font-semibold">
            <Link to={`/teams/${teamId}/friction/start`} state={{ prefillTopic: latest.trendInsight }} style={{ color: 'var(--color-tier2-fg)' }}>
              Explore this &rarr;
            </Link>
            <Link to={`/teams/${teamId}/vision`} style={{ color: 'var(--color-tier2-fg)' }}>
              Revisit the vision
            </Link>
          </div>
        </div>
      )}

      <WeeklyMetricsChart
        vibePoints={vibePoints.map((s) => ({ period_start: s.period_start as string, avg: (s.value as { avg: number }).avg }))}
        taskCounts={taskCounts ?? []}
        frictionCounts={frictionCounts ?? []}
        selected={effectiveSelected}
        onSelect={setSelectedPeriod}
      />

      {selectedVibePoint &&
        (() => {
          const distribution = (selectedVibePoint.value as { distribution?: Record<string, number> } | undefined)?.distribution
          if (!distribution) return null
          const maxCount = Math.max(...Object.values(distribution), 1)
          return (
            <Card>
              <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
                Energy distribution <TierBadge tier={3} />
              </div>
              <div className="mb-2.5 text-[11px]" style={{ color: 'var(--color-eol-text-muted)' }}>
                Week of {formatShortDate(effectiveSelected)}
              </div>
              <div className="flex items-end justify-between gap-2" style={{ height: 70 }}>
                {[1, 2, 3, 4, 5].map((score) => {
                  const count = distribution[String(score)] ?? 0
                  return (
                    <div key={score} className="flex flex-1 flex-col items-center gap-1.5">
                      <div className="text-[10.5px]" style={{ color: 'var(--color-eol-text-faint)' }}>
                        {count > 0 ? count : ''}
                      </div>
                      <div
                        className="w-full rounded-md"
                        style={{
                          height: `${(count / maxCount) * 44 + (count > 0 ? 4 : 0)}px`,
                          background: `oklch(${0.9 - score * 0.04} ${0.02 + score * 0.03} 78)`,
                        }}
                      />
                      <div className="text-[10px]" style={{ color: 'var(--color-eol-text-faint)' }}>
                        {score}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-1.5 flex justify-between text-[10px]" style={{ color: 'var(--color-eol-text-faint)' }}>
                <span>Drained</span>
                <span>Energized</span>
              </div>
            </Card>
          )
        })()}

      {effectiveSelected && (
        <Card>
          <div className="mb-2.5 text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
            Completed the week of {formatShortDate(effectiveSelected)}
          </div>
          {!completedItems?.length ? (
            <p className="m-0 text-[12px]" style={{ color: 'var(--color-eol-text-faint)' }}>
              Nothing completed this week.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {completedItems.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center gap-2.5">
                  <div className="min-w-0 flex-1 truncate text-[12.5px]" style={{ color: 'var(--color-eol-text)' }}>
                    {item.title}
                  </div>
                  <TaskTypeBadge type={item.type} />
                  {item.assignee_id && <Avatar name={memberName(item.assignee_id) ?? '?'} avatarUrl={memberAvatarUrl(item.assignee_id)} size={20} />}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {selectedValue && ((selectedValue.gaveThemes?.length ?? 0) > 0 || (selectedValue.drainedThemes?.length ?? 0) > 0) && (
        <div className="flex flex-wrap gap-4">
          {/* Themes are display-only, paraphrased strings — never a click target
              that reveals who contributed. No drill-down, ever (spec: no
              filtering combination should become a backdoor to attribution). */}
          <Card className="min-w-[220px] flex-1">
            <div className="mb-2 text-[12px] font-semibold" style={{ color: 'var(--color-tier4-fg)' }}>
              What's been giving energy
            </div>
            {!selectedValue.gaveThemes?.length ? (
              <p className="m-0 text-[12px]" style={{ color: 'var(--color-eol-text-faint)' }}>
                Not enough contributors yet.
              </p>
            ) : (
              <ul className="m-0 flex flex-col gap-1 pl-4 text-[12.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
                {selectedValue.gaveThemes.map((theme, i) => (
                  <li key={i}>{theme}</li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="min-w-[220px] flex-1">
            <div className="mb-2 text-[12px] font-semibold" style={{ color: 'var(--color-tier2-fg)' }}>
              What's been draining energy
            </div>
            {!selectedValue.drainedThemes?.length ? (
              <p className="m-0 text-[12px]" style={{ color: 'var(--color-eol-text-faint)' }}>
                Not enough contributors yet.
              </p>
            ) : (
              <ul className="m-0 flex flex-col gap-1 pl-4 text-[12.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
                {selectedValue.drainedThemes.map((theme, i) => (
                  <li key={i}>{theme}</li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {!selectedValue?.pattern ? (
        <Card>
          <p className="m-0 text-[13px]" style={{ color: 'var(--color-eol-text-faint)' }}>
            {narratives.length === 0 ? 'Not enough responses to generate a team pattern yet.' : "Not enough responses that week to generate a team pattern."}
          </p>
        </Card>
      ) : (
        <Card>
          <div className="mb-2 text-[11.5px]" style={{ color: 'var(--color-eol-text-muted)' }}>
            Week of {selectedNarrative?.period_start}
          </div>
          <p className="m-0 text-[13.5px] leading-relaxed" style={{ color: 'var(--color-eol-text)' }}>
            {selectedValue.pattern}
          </p>
          {selectedValue.visionInsight && (
            <p className="m-0 mt-3 border-t pt-3 text-[12.5px] leading-relaxed" style={{ borderColor: 'var(--color-eol-border)', color: 'var(--color-eol-text-secondary)' }}>
              {selectedValue.visionInsight}
            </p>
          )}
        </Card>
      )}
    </div>
  )
}
