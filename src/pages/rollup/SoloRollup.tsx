import { WeeklyCountChart } from '../../components/rollup/WeeklyCountChart'
import { useCompletedExperimentsByWeek, useFrictionProcessedByWeek, useMyVibeScoresByWeek } from '../../hooks/useWeeklyCompletions'

// Solo (team-of-one) rollup reads the user's own raw rows directly instead
// of team_signals — team_signals' n>=3 contributor gate can never fire for
// a solo team, and shouldn't be loosened for one (spec §1,
// 20260812090000_solo_mode_docs.sql). No AI narrative here yet: a
// privacy-safe solo narrative generation path (reading only this user's own
// data, no anonymization needed) is a clear follow-up, not this round.
export function SoloRollup({ teamId }: { teamId: string }) {
  const { data: vibePoints } = useMyVibeScoresByWeek(teamId)
  const { data: taskCounts } = useCompletedExperimentsByWeek(teamId)
  const { data: frictionCounts } = useFrictionProcessedByWeek(teamId)

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

      <WeeklyCountChart
        label="Your vibe, week over week"
        description="Your weekly check-in score (1–5)."
        points={vibePoints ?? []}
        emptyLabel="No vibe checks yet — the weekly pulse check is where this starts."
      />

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
    </div>
  )
}
