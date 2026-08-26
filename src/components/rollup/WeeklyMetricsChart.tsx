import { Card } from '../shared/Card'
import type { WeekCount } from '../../hooks/useWeeklyCompletions'

function formatShortDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

const ENERGY_COLOR = 'var(--color-eol-accent)'
const TASKS_COLOR = 'var(--color-eol-accent-hover)'
const FRICTION_COLOR = 'var(--color-tier4-dot, var(--color-tier4-fg))'
const BAR_HEIGHT = 60

type VibePoint = { period_start: string; avg: number }

type WeeklyMetricsChartProps = {
  vibePoints: VibePoint[]
  taskCounts: WeekCount[]
  frictionCounts: WeekCount[]
  selected: string | null
  onSelect: (periodStart: string) => void
  maxWeeks?: number
}

// One clickable column per week, three small bars inside it (energy, tasks,
// friction) — replaces three separate charts (the old 1-5 vibe chart plus
// two WeeklyCountChart instances) with a single picture. The three series
// don't necessarily share the same weeks (a rollup may not have been
// generated for every week that had completed tasks, or vice versa), so the
// x-axis is the union of all three, and a week missing from one series just
// renders that one bar as an empty placeholder rather than dropping the
// column.
export function WeeklyMetricsChart({ vibePoints, taskCounts, frictionCounts, selected, onSelect, maxWeeks = 12 }: WeeklyMetricsChartProps) {
  const weeks = [...new Set([...vibePoints.map((p) => p.period_start), ...taskCounts.map((p) => p.period_start), ...frictionCounts.map((p) => p.period_start)])]
    .sort((a, b) => (a < b ? 1 : -1))
    .slice(0, maxWeeks)
    .reverse()

  if (weeks.length === 0) {
    return (
      <Card>
        <p className="m-0 text-[12px]" style={{ color: 'var(--color-eol-text-faint)' }}>
          No activity yet — energy, tasks, and friction will show up here once there's a week of data.
        </p>
      </Card>
    )
  }

  const vibeByWeek = new Map(vibePoints.map((p) => [p.period_start, p.avg]))
  const tasksByWeek = new Map(taskCounts.map((p) => [p.period_start, p.count]))
  const frictionByWeek = new Map(frictionCounts.map((p) => [p.period_start, p.count]))
  const maxTasks = Math.max(...taskCounts.map((p) => p.count), 1)
  const maxFriction = Math.max(...frictionCounts.map((p) => p.count), 1)

  const bar = (value: number | undefined, max: number, color: string) => (
    <div
      style={{
        width: 8,
        height: value ? `${Math.max((value / max) * BAR_HEIGHT, 4)}px` : '3px',
        background: value ? color : 'var(--color-eol-border-strong)',
        borderRadius: 2,
        opacity: value ? 1 : 0.35,
      }}
    />
  )

  return (
    <Card>
      <div className="mb-3 flex items-center gap-4 text-[11px]" style={{ color: 'var(--color-eol-text-muted)' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: ENERGY_COLOR }} /> Energy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: TASKS_COLOR }} /> Tasks completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: FRICTION_COLOR }} /> Friction processed
        </span>
      </div>
      <div className="flex items-end gap-4 overflow-x-auto pb-1">
        {weeks.map((week) => {
          const isSelected = week === selected
          return (
            <button
              key={week}
              type="button"
              onClick={() => onSelect(week)}
              className="flex shrink-0 flex-col items-center gap-1.5 rounded-lg px-1.5 py-1"
              style={{ background: isSelected ? 'var(--color-eol-surface)' : 'transparent', outline: isSelected ? '1.5px solid var(--color-eol-accent-hover)' : 'none' }}
            >
              <div className="flex items-end gap-1" style={{ height: BAR_HEIGHT }}>
                {bar(vibeByWeek.get(week), 5, ENERGY_COLOR)}
                {bar(tasksByWeek.get(week), maxTasks, TASKS_COLOR)}
                {bar(frictionByWeek.get(week), maxFriction, FRICTION_COLOR)}
              </div>
              <span
                className="text-[9.5px] whitespace-nowrap"
                style={{ color: isSelected ? 'var(--color-eol-text)' : 'var(--color-eol-text-faint)', fontWeight: isSelected ? 600 : 400 }}
              >
                {formatShortDate(week)}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
