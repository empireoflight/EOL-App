import { useState } from 'react'
import { Card } from '../../components/shared/Card'
import { Avatar } from '../../components/shared/Avatar'
import { TaskTypeBadge } from '../../components/shared/TaskTypeBadge'
import { WeeklyMetricsChart } from '../../components/rollup/WeeklyMetricsChart'
import { useCompletedTasksByWeek, useFrictionProcessedByWeek, useMyVibeScoresByWeek, useCompletedItemsForWeek } from '../../hooks/useWeeklyCompletions'
import { useTeamMembers } from '../../hooks/useMyTeams'

function formatShortDate(isoDate: string | null): string {
  if (!isoDate) return ''
  const d = new Date(`${isoDate}T00:00:00Z`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

// Solo (team-of-one) rollup reads the user's own raw rows directly instead
// of team_signals — team_signals' n>=3 contributor gate can never fire for
// a solo team, and shouldn't be loosened for one (spec §1,
// 20260812090000_solo_mode_docs.sql). No AI narrative here yet: a
// privacy-safe solo narrative generation path (reading only this user's own
// data, no anonymization needed) is a clear follow-up, not this round.
export function SoloRollup({ teamId }: { teamId: string }) {
  const { data: vibePoints } = useMyVibeScoresByWeek(teamId)
  const { data: taskCounts } = useCompletedTasksByWeek(teamId)
  const { data: frictionCounts } = useFrictionProcessedByWeek(teamId)
  const { data: members } = useTeamMembers(teamId)

  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)
  const effectiveSelected = selectedPeriod ?? vibePoints?.[0]?.period_start ?? taskCounts?.[0]?.period_start ?? frictionCounts?.[0]?.period_start ?? null
  const { data: completedItems } = useCompletedItemsForWeek(teamId, effectiveSelected)

  const memberName = (id: string | null) => members?.find((m) => m.user_id === id)?.users?.name ?? null

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-6 py-10">
      <div>
        <h1 className="m-0 text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          What are you learning?
        </h1>
        <p className="m-0 mt-1 text-[13px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
          Your own weekly rhythm — vibe, tasks completed, and friction processed. All of it worth celebrating.
        </p>
      </div>

      <WeeklyMetricsChart
        vibePoints={(vibePoints ?? []).map((p) => ({ period_start: p.period_start, avg: p.count }))}
        taskCounts={taskCounts ?? []}
        frictionCounts={frictionCounts ?? []}
        selected={effectiveSelected}
        onSelect={setSelectedPeriod}
      />

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
                  {item.assignee_id && <Avatar name={memberName(item.assignee_id) ?? '?'} size={20} />}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
