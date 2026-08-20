import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useDurableForm } from '../../hooks/useDurableForm'
import { getWeekStart } from '../../lib/week'
import { Button } from '../../components/shared/Button'
import { Textarea } from '../../components/shared/Input'
import { Card } from '../../components/shared/Card'
import { TierBadge } from '../../components/shared/TierBadge'
import { LearningPrompt } from '../../components/experiments/LearningPrompt'
import type { Experiment } from '../../lib/types'

type PulseDraft = { gave: string; drained: string }

const VIBE_LEVELS = [1, 2, 3, 4, 5]

function BatteryIcon({ level, active, onClick }: { level: number; active: boolean; onClick: () => void }) {
  const fillColor = `oklch(${0.9 - level * 0.04} ${0.02 + level * 0.03} 78)`
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Vibe level ${level}`}
      className="flex flex-col items-center gap-1 rounded-xl px-2 py-2"
      style={{
        background: active ? 'var(--color-tier2-bg)' : 'transparent',
        border: active ? '1px solid var(--color-tier2-fg)' : '1px solid transparent',
      }}
    >
      <svg width="34" height="18" viewBox="0 0 34 18">
        <rect x="1" y="1" width="28" height="16" rx="3" fill="none" stroke="var(--color-eol-border-strong)" strokeWidth="1.5" />
        <rect x="30" y="6" width="3" height="6" rx="1" fill="var(--color-eol-border-strong)" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={4 + i * 5} y={4} width="3.4" height="10" rx="0.8" fill={i < level ? fillColor : 'transparent'} />
        ))}
      </svg>
    </button>
  )
}

function useReviewExperiments(teamId: string | undefined) {
  return useQuery({
    queryKey: ['pulse-review-experiments', teamId],
    queryFn: async (): Promise<Experiment[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('experiments')
        .select('*')
        .eq('team_id', teamId as string)
        .in('status', ['not_started', 'in_progress'])
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!teamId,
  })
}

export default function PulseCheckPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const weekOf = getWeekStart()
  const [vibe, setVibe] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { data: reviewExperiments } = useReviewExperiments(teamId)
  const [justCompleted, setJustCompleted] = useState<Experiment[]>([])

  const updateExperimentStatus = useMutation({
    mutationFn: async ({ exp, status }: { exp: Experiment; status: Experiment['status'] }) => {
      if (!supabase) throw new Error('Not ready')
      const { error } = await supabase.from('experiments').update({ status }).eq('id', exp.id)
      if (error) throw error
      return { exp, status }
    },
    onSuccess: ({ exp, status }) => {
      // The review list only ever shows not_started/in_progress items, so a
      // 'done' item is about to drop out of it — keep a local copy around
      // just long enough to offer the learning prompt.
      if (status === 'done') setJustCompleted((prev) => [...prev, { ...exp, status: 'done' }])
      queryClient.invalidateQueries({ queryKey: ['pulse-review-experiments', teamId] })
    },
  })

  const { value: draft, setValue: setDraft, saveState, discard } = useDurableForm<PulseDraft>({
    formKey: `pulse-${teamId}-${weekOf}`,
    tier: 2,
    initialValue: { gave: '', drained: '' },
    userId: user?.id,
  })

  const handleSubmit = async () => {
    if (!supabase || !teamId || !user || !vibe) return
    setSubmitting(true)
    setError('')
    try {
      await supabase
        .from('pulse_vibe_scores')
        .upsert({ user_id: user.id, team_id: teamId, week_of: weekOf, score: vibe }, { onConflict: 'user_id,team_id,week_of' })

      const noteRows = (['gave', 'drained'] as const)
        .filter((direction) => draft[direction].trim())
        .map((direction) => ({ user_id: user.id, team_id: teamId, week_of: weekOf, direction, text: draft[direction].trim() }))
      if (noteRows.length > 0) {
        await supabase.from('pulse_energy_notes').upsert(noteRows, { onConflict: 'user_id,team_id,week_of,direction' })
      }

      discard()
      navigate(`/teams/${teamId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your vibe check.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 px-6 py-10">
      <div>
        <div className="mb-1 text-[11px]" style={{ color: 'var(--color-eol-text-muted)' }}>
          End of week
        </div>
        <h1 className="m-0 text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          Weekly vibe check
        </h1>
      </div>

      {error && (
        <div className="rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-pink)', color: 'var(--color-eol-pink-strong)' }}>
          {error}
        </div>
      )}

      {reviewExperiments && reviewExperiments.length > 0 && (
        <Card>
          <div className="mb-2.5 flex items-center gap-2">
            <div className="text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
              Quick task review
            </div>
            <TierBadge tier={4} />
          </div>
          <div className="flex flex-col gap-1.5">
            {reviewExperiments.map((exp) => (
              <div key={exp.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1 truncate text-[12.5px]" style={{ color: 'var(--color-eol-text)' }}>
                  {exp.title}
                </div>
                {(['in_progress', 'done', 'dropped'] as Experiment['status'][]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => updateExperimentStatus.mutate({ exp, status })}
                    className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-medium"
                    style={
                      exp.status === status
                        ? { background: 'var(--color-tier4-bg)', color: 'var(--color-tier4-fg)' }
                        : { border: '1px solid var(--color-eol-border-strong)', color: 'var(--color-eol-text-muted)' }
                    }
                  >
                    {status === 'in_progress' ? 'Carry over' : status === 'done' ? 'Done' : 'Drop'}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}

      {justCompleted.length > 0 && (
        <Card>
          <div className="mb-2.5 text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
            Nice — what did you learn?
          </div>
          <div className="flex flex-col gap-3.5">
            {justCompleted.map((exp) => (
              <div key={exp.id}>
                <div className="mb-1 text-[12.5px] font-medium" style={{ color: 'var(--color-eol-text)' }}>
                  {exp.title}
                </div>
                <LearningPrompt
                  experimentId={exp.id}
                  learning={exp.learning}
                  autoOpen
                  onSaved={() => setJustCompleted((prev) => prev.filter((e) => e.id !== exp.id))}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <TierBadge tier={2} />
        <span className="text-[11px]" style={{ color: 'var(--color-eol-text-faint)' }}>
          {saveState === 'saving' ? 'Saving…' : 'Saved'} &middot; never shown raw to your team, only used to notice patterns across the whole team
        </span>
      </div>

      <Card>
        <Textarea
          label="What gave you energy this week?"
          hint="What actually felt energizing, meaningful, fun, satisfying, or alive?"
          value={draft.gave}
          onChange={(e) => setDraft({ ...draft, gave: e.target.value })}
        />
      </Card>
      <Card>
        <Textarea
          label="What drained your energy this week?"
          hint="What actually felt frustrating, heavy, confusing, repetitive, or draining?"
          value={draft.drained}
          onChange={(e) => setDraft({ ...draft, drained: e.target.value })}
        />
      </Card>

      <Card>
        <div className="mb-1 flex items-center gap-2">
          <div className="text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
            How's your energy right now?
          </div>
          <TierBadge tier={1} />
        </div>
        <p className="m-0 mb-2.5 text-[11px]" style={{ color: 'var(--color-eol-text-faint)' }}>
          Saved privately — only becomes part of a team average once at least 3 people check in that week.
        </p>
        <div className="flex items-center justify-between">
          {VIBE_LEVELS.map((level) => (
            <BatteryIcon key={level} level={level} active={vibe === level} onClick={() => setVibe(level)} />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--color-eol-text-faint)' }}>
          <span>Very low</span>
          <span>Very high</span>
        </div>
      </Card>

      <Button onClick={handleSubmit} loading={submitting} disabled={!vibe} className="w-full">
        Save vibe check
      </Button>
    </div>
  )
}
