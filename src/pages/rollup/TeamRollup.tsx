import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { getWeekStart } from '../../lib/week'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { TierBadge } from '../../components/shared/TierBadge'
import { WeeklyCountChart } from '../../components/rollup/WeeklyCountChart'
import { useCompletedExperimentsByWeek, useFrictionProcessedByWeek } from '../../hooks/useWeeklyCompletions'
import type { TeamSignal } from '../../lib/types'

type RollupValue = {
  pattern?: string
  gaveThemes?: string[]
  drainedThemes?: string[]
  visionInsight?: string | null
  trendInsight?: string | null
}

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

export function TeamRollup({ teamId }: { teamId: string }) {
  const queryClient = useQueryClient()
  const { data: signals } = useTeamSignals(teamId)
  const { data: taskCounts } = useCompletedExperimentsByWeek(teamId)
  const { data: frictionCounts } = useFrictionProcessedByWeek(teamId)
  const [generating, setGenerating] = useState(false)
  const [notice, setNotice] = useState('')

  const narratives = (signals ?? []).filter((s) => s.signal_type === 'weekly_narrative')
  const vibePoints = (signals ?? []).filter((s) => s.signal_type === 'vibe_avg')
  const latest = narratives[0]?.value as RollupValue | undefined

  // Default selection is the most recently completed week — vibePoints is
  // already ordered newest-first, so [0] is that week. Once the user picks
  // a bar, that choice sticks even if new data arrives.
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)
  const effectiveSelected = selectedPeriod ?? vibePoints[0]?.period_start ?? null
  const selectedVibePoint = vibePoints.find((p) => p.period_start === effectiveSelected)
  const selectedNarrative = narratives.find((n) => n.period_start === effectiveSelected)
  const selectedValue = selectedNarrative?.value as RollupValue | undefined

  const handleGenerate = async () => {
    if (!supabase || !teamId) return
    setGenerating(true)
    setNotice('')
    try {
      const { data: authData } = await supabase.auth.getSession()
      const { data, error } = await supabase.functions.invoke('aggregate-weekly-pulse', {
        body: { teamId, weekOf: getWeekStart() },
        headers: { Authorization: `Bearer ${authData.session?.access_token}` },
      })
      if (error) throw error
      if (data?.reason === 'not_enough_contributors') {
        setNotice(`Needs at least 3 people checked in this week (${data.vibeContributorCount} so far).`)
      } else {
        queryClient.invalidateQueries({ queryKey: ['team-signals', teamId] })
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
          Generate this week's rollup
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

      {vibePoints.length > 0 && (
        <Card>
          <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
            Team energy, week over week <TierBadge tier={3} />
          </div>
          <p className="m-0 mb-3 text-[11.5px]" style={{ color: 'var(--color-eol-text-faint)' }}>
            Average score (1&ndash;5) per week a rollup was generated.
          </p>
          <div className="flex gap-2">
            <div className="flex flex-col justify-between text-[10px]" style={{ height: 60, color: 'var(--color-eol-text-faint)' }}>
              <span>5</span>
              <span>1</span>
            </div>
            <div className="flex flex-1 items-end gap-3 border-l pl-3" style={{ borderColor: 'var(--color-eol-border)' }}>
              {[...vibePoints].reverse().map((s) => {
                const avg = (s.value as { avg: number }).avg
                const selected = s.period_start === effectiveSelected
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedPeriod(s.period_start)}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="text-[10px]" style={{ color: selected ? 'var(--color-eol-text)' : 'var(--color-eol-text-muted)', fontWeight: selected ? 600 : 400 }}>
                      {avg.toFixed(1)}
                    </span>
                    <div
                      title={`${avg.toFixed(1)} · ${s.period_start}`}
                      style={{
                        width: 14,
                        height: `${(avg / 5) * 60}px`,
                        background: 'var(--color-eol-accent)',
                        borderRadius: 3,
                        opacity: selected ? 1 : 0.4,
                        outline: selected ? '2px solid var(--color-eol-accent-hover)' : 'none',
                        outlineOffset: 2,
                      }}
                    />
                    <span
                      className="text-[9.5px] whitespace-nowrap"
                      style={{ color: selected ? 'var(--color-eol-text)' : 'var(--color-eol-text-faint)', fontWeight: selected ? 600 : 400 }}
                    >
                      {formatShortDate(s.period_start)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {(() => {
            const distribution = (selectedVibePoint?.value as { distribution?: Record<string, number> } | undefined)?.distribution
            if (!distribution) return null
            const maxCount = Math.max(...Object.values(distribution), 1)
            return (
              <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--color-eol-border)' }}>
                <div className="mb-2.5 text-[11px]" style={{ color: 'var(--color-eol-text-muted)' }}>
                  Distribution for the week of {formatShortDate(effectiveSelected)}
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
              </div>
            )
          })()}
        </Card>
      )}

      <div className="flex flex-wrap gap-4">
        <div className="min-w-[220px] flex-1">
          <WeeklyCountChart
            label="Tasks completed"
            description="Experiments marked done, per week."
            points={taskCounts ?? []}
            emptyLabel="No tasks completed yet."
          />
        </div>
        <div className="min-w-[220px] flex-1">
          <WeeklyCountChart
            label="Friction processed"
            description="Friction sessions worked through, per week — worth celebrating, not fearing."
            points={frictionCounts ?? []}
            emptyLabel="No friction processed yet."
            accentColor="var(--color-tier4-dot)"
          />
        </div>
      </div>

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
