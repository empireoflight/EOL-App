import { Fragment } from 'react'
import { Card } from '../shared/Card'
import type { WeekCount } from '../../hooks/useWeeklyCompletions'

function formatShortDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

const ENERGY_COLOR = 'var(--color-eol-chart-energy)'
const TASKS_COLOR = 'var(--color-eol-chart-tasks)'
const FRICTION_COLOR = 'var(--color-eol-chart-friction)'
const ENERGY_MAX = 5

const VIEW_WIDTH = 760
const VIEW_HEIGHT = 200
const PAD_X = 30
const TOP_Y = 20
const BOTTOM_Y = 180
const GRIDLINES = [20, 73.33, 126.67, 180]

type VibePoint = { period_start: string; avg: number }

type WeeklyMetricsChartProps = {
  vibePoints: VibePoint[]
  taskCounts: WeekCount[]
  frictionCounts: WeekCount[]
  selected: string | null
  onSelect: (periodStart: string) => void
  maxWeeks?: number
}

// One point per week per series, connected into a line — three trend lines
// (energy, tasks, friction) sharing one x-axis of weeks. The three series
// don't necessarily share the same weeks (a rollup may not have been
// generated for every week that had completed tasks, or vice versa), so the
// x-axis is the union of all three, and a week missing from a given series
// just breaks that series' line rather than dropping the week entirely.
function buildLine(valuesByWeek: (number | null)[], max: number): { path: string; points: { x: number; y: number; idx: number }[] } {
  const n = valuesByWeek.length
  const xFor = (i: number) => (n === 1 ? (PAD_X + (VIEW_WIDTH - PAD_X * 2)) / 2 : PAD_X + (i * (VIEW_WIDTH - PAD_X * 2)) / (n - 1))
  const points = valuesByWeek
    .map((v, i) => (v == null ? null : { x: xFor(i), y: BOTTOM_Y - (v / max) * (BOTTOM_Y - TOP_Y), idx: i }))
    .filter((p): p is { x: number; y: number; idx: number } => p !== null)

  // Break the line wherever a week is missing for this series, instead of
  // drawing a straight (misleading) segment across the gap.
  const segments: { x: number; y: number; idx: number }[][] = []
  for (const p of points) {
    const last = segments.at(-1)
    if (last && p.idx === last.at(-1)!.idx + 1) last.push(p)
    else segments.push([p])
  }

  return { path: segments.map((seg) => seg.map((p) => `${p.x},${p.y}`).join(' ')).join('|'), points }
}

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

  const series = [
    { color: ENERGY_COLOR, ...buildLine(weeks.map((w) => vibeByWeek.get(w) ?? null), ENERGY_MAX) },
    { color: TASKS_COLOR, ...buildLine(weeks.map((w) => tasksByWeek.get(w) ?? null), maxTasks) },
    { color: FRICTION_COLOR, ...buildLine(weeks.map((w) => frictionByWeek.get(w) ?? null), maxFriction) },
  ]

  const selectedIdx = selected ? weeks.indexOf(selected) : -1
  const selectedX = selectedIdx >= 0 ? (weeks.length === 1 ? VIEW_WIDTH / 2 : PAD_X + (selectedIdx * (VIEW_WIDTH - PAD_X * 2)) / (weeks.length - 1)) : null

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center gap-[22px] text-[13px] font-medium" style={{ color: 'var(--color-eol-text-secondary)' }}>
        <span className="flex items-center gap-2">
          <span className="inline-block h-[3px] w-[14px] rounded-[2px]" style={{ background: ENERGY_COLOR }} /> Energy
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-[3px] w-[14px] rounded-[2px]" style={{ background: TASKS_COLOR }} /> Tasks completed
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-[3px] w-[14px] rounded-[2px]" style={{ background: FRICTION_COLOR }} /> Friction processed
        </span>
      </div>

      <svg width="100%" height={VIEW_HEIGHT} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {GRIDLINES.map((y) => (
          <line key={y} x1={0} x2={VIEW_WIDTH} y1={y} y2={y} stroke="rgba(40,25,10,0.07)" />
        ))}
        {selectedX != null && <line x1={selectedX} x2={selectedX} y1={TOP_Y} y2={BOTTOM_Y} stroke="var(--color-eol-accent-hover)" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.6} />}
        {series.map(({ color, path, points }, si) => (
          <Fragment key={si}>
            {path
              .split('|')
              .filter(Boolean)
              .map((seg, i) => (
                <polyline key={i} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" points={seg} />
              ))}
            {points.map((p) => {
              const isLatest = p.idx === weeks.length - 1
              return (
                <circle
                  key={p.idx}
                  cx={p.x}
                  cy={p.y}
                  r={isLatest ? 5 : 3.5}
                  fill={isLatest ? color : 'var(--color-eol-surface)'}
                  stroke={color}
                  strokeWidth={2}
                />
              )
            })}
          </Fragment>
        ))}
      </svg>

      <div className="mt-2.5 flex justify-between px-0.5">
        {weeks.map((week) => {
          const isSelected = week === selected
          return (
            <button
              key={week}
              type="button"
              onClick={() => onSelect(week)}
              className="text-[12px] whitespace-nowrap"
              style={{ color: isSelected ? 'var(--color-eol-text)' : 'var(--color-eol-text-muted)', fontWeight: isSelected ? 600 : 400 }}
            >
              {formatShortDate(week)}
            </button>
          )
        })}
      </div>
    </Card>
  )
}
