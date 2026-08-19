import { Card } from '../shared/Card'
import type { WeekCount } from '../../hooks/useWeeklyCompletions'

function formatShortDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

type WeeklyCountChartProps = {
  label: string
  description: string
  points: WeekCount[]
  emptyLabel: string
  accentColor?: string
}

/** Small bar chart for an open-ended weekly count (tasks completed,
 * friction sessions processed) — same visual language as RollupPage's
 * 1-5-scale vibe chart, but scaled to whatever the data's own max is
 * instead of a fixed range. */
export function WeeklyCountChart({ label, description, points, emptyLabel, accentColor = 'var(--color-eol-accent)' }: WeeklyCountChartProps) {
  if (points.length === 0) {
    return (
      <Card>
        <div className="mb-1 text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
          {label}
        </div>
        <p className="m-0 text-[12px]" style={{ color: 'var(--color-eol-text-faint)' }}>
          {emptyLabel}
        </p>
      </Card>
    )
  }

  const maxCount = Math.max(...points.map((p) => p.count), 1)

  return (
    <Card>
      <div className="mb-1 text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
        {label}
      </div>
      <p className="m-0 mb-3 text-[11.5px]" style={{ color: 'var(--color-eol-text-faint)' }}>
        {description}
      </p>
      <div className="flex items-end gap-3 border-l pl-3" style={{ borderColor: 'var(--color-eol-border)' }}>
        {[...points].reverse().map((p) => (
          <div key={p.period_start} className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-semibold" style={{ color: 'var(--color-eol-text-muted)' }}>
              {p.count}
            </span>
            <div
              title={`${p.count} · ${p.period_start}`}
              style={{
                width: 14,
                height: `${Math.max((p.count / maxCount) * 60, p.count > 0 ? 4 : 1)}px`,
                background: accentColor,
                borderRadius: 3,
                opacity: p.count > 0 ? 1 : 0.25,
              }}
            />
            <span className="text-[9.5px] whitespace-nowrap" style={{ color: 'var(--color-eol-text-faint)' }}>
              {formatShortDate(p.period_start)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
