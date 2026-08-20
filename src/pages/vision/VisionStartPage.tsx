import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOpenVisionSession } from '../../hooks/useConvergenceSession'
import { getVisionQuestions, type VisionQuestion } from '../../lib/visionQuestions'
import { TeamInvitePanel } from '../../components/team/TeamInvitePanel'
import { Button } from '../../components/shared/Button'
import { Input } from '../../components/shared/Input'
import { Textarea } from '../../components/shared/Input'
import { Card } from '../../components/shared/Card'
import { LoadingScreen } from '../../components/shared/LoadingScreen'

const HORIZONS = ['6 months', '12 months', '18 months', '3 years']

type Step = 'invite' | 'framing' | 'questions'

function QuestionRow({
  question,
  index,
  count,
  onChange,
  onRemove,
  onMove,
}: {
  question: VisionQuestion
  index: number
  count: number
  onChange: (patch: Partial<VisionQuestion>) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border p-3" style={{ borderColor: 'var(--color-eol-border-strong)' }}>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          aria-label="Move up"
          className="text-[13px] leading-none disabled:opacity-30"
          style={{ color: 'var(--color-eol-text-muted)' }}
        >
          &uarr;
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === count - 1}
          aria-label="Move down"
          className="text-[13px] leading-none disabled:opacity-30"
          style={{ color: 'var(--color-eol-text-muted)' }}
        >
          &darr;
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <Input value={question.prompt} onChange={(e) => onChange({ prompt: e.target.value })} />
        <label className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--color-eol-text-muted)' }}>
          <input type="checkbox" checked={!!question.optional} onChange={(e) => onChange({ optional: e.target.checked })} />
          Optional
        </label>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove question"
        className="shrink-0 text-[15px] opacity-50 hover:opacity-100"
        style={{ color: 'var(--color-eol-text-muted)' }}
      >
        &times;
      </button>
    </div>
  )
}

export default function VisionStartPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: openSession, isLoading: openSessionLoading } = useOpenVisionSession(teamId)
  // Always offer the invite step first, every time — an established team
  // starting another session may still want to add someone new before
  // framing. `manualStep` overrides it once the user clicks Continue, a
  // pure derivation instead of syncing state via an effect.
  const [manualStep, setManualStep] = useState<Step | null>(null)
  const step = manualStep ?? 'invite'
  const [scope, setScope] = useState('')
  const [horizon, setHorizon] = useState(HORIZONS[1])
  const [whyNow, setWhyNow] = useState('')
  const [questions, setQuestions] = useState<VisionQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const updateQuestion = (id: string, patch: Partial<VisionQuestion>) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  const removeQuestion = (id: string) => setQuestions((qs) => qs.filter((q) => q.id !== id))
  const moveQuestion = (index: number, direction: -1 | 1) =>
    setQuestions((qs) => {
      const next = [...qs]
      const target = index + direction
      if (target < 0 || target >= next.length) return qs
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  const [newQuestionText, setNewQuestionText] = useState('')
  const addQuestion = () => {
    if (!newQuestionText.trim()) return
    setQuestions((qs) => [...qs, { id: crypto.randomUUID(), prompt: newQuestionText.trim() }])
    setNewQuestionText('')
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!supabase || !teamId || !user) return
    setLoading(true)
    setError('')
    try {
      const { data: session, error: sessionError } = await supabase
        .from('convergence_sessions')
        .insert({
          team_id: teamId,
          session_type: 'vision',
          status: 'collecting',
          initiator_id: user.id,
          framing: { scope, horizon, whyNow, questions },
        })
        .select()
        .single()
      if (sessionError) throw sessionError

      const { data: currentMembers, error: membersError } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId)
      if (membersError) throw membersError

      const { error: participantsError } = await supabase
        .from('session_participants')
        .insert(currentMembers.map((m) => ({ session_id: session.id, user_id: m.user_id })))
      if (participantsError) throw participantsError

      navigate(`/teams/${teamId}/vision/sessions/${session.id}/reflect`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the session.")
    } finally {
      setLoading(false)
    }
  }

  // Starting a second session here would fork the reflections people have
  // already submitted to the open one — go straight there instead of
  // making the user read a message and click through.
  useEffect(() => {
    if (openSession && teamId) {
      navigate(`/teams/${teamId}/vision/sessions/${openSession.id}`, { replace: true })
    }
  }, [openSession, teamId, navigate])

  if (step === null || !teamId) return null

  if (openSessionLoading || openSession) return <LoadingScreen />

  if (step === 'invite') {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-5 px-6 py-10">
        <div>
          <h1 className="m-0 text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            Who's doing this with you?
          </h1>
          <p className="m-0 mt-1 text-[13px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
            A vision built with your team goes further than one written alone. Invite the people you're building
            with, or continue on your own for now — you can always invite people later.
          </p>
        </div>

        <TeamInvitePanel teamId={teamId} />

        <Button onClick={() => setManualStep('framing')} className="w-full">
          Continue
        </Button>
      </div>
    )
  }

  if (step === 'framing') {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-5 px-6 py-10">
        <div>
          <h1 className="m-0 text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            Start a vision session
          </h1>
          <p className="m-0 mt-1 text-[13px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
            A little framing first, so everyone answers at the same altitude.
          </p>
        </div>

        <Card>
          <form
            onSubmit={(ev) => {
              ev.preventDefault()
              setQuestions(getVisionQuestions(horizon))
              setManualStep('questions')
            }}
            className="flex flex-col gap-4"
          >
            <Input label="Scope — this team / project / product" required value={scope} onChange={(e) => setScope(e.target.value)} placeholder="This team" />
            <label className="flex flex-col gap-1.5 text-left">
              <span className="text-[11px] font-medium" style={{ color: 'var(--color-eol-text-muted)' }}>
                Time horizon
              </span>
              <select
                value={horizon}
                onChange={(e) => setHorizon(e.target.value)}
                className="rounded-lg border px-3 py-2.5 text-[13px]"
                style={{ borderColor: 'var(--color-eol-border-strong)', background: 'var(--color-eol-surface-light)', color: 'var(--color-eol-text)' }}
              >
                {HORIZONS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
            <Textarea label="Why now" hint="One or two sentences on what prompted this session." required value={whyNow} onChange={(e) => setWhyNow(e.target.value)} />
            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-6 py-10">
      <div>
        <h1 className="m-0 text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          Review the questions
        </h1>
        <p className="m-0 mt-1 text-[13px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
          These are what everyone will answer. Edit, reorder, remove, or add your own — this set is locked in once the
          session starts.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-pink)', color: 'var(--color-eol-pink-strong)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2.5">
          {questions.map((q, i) => (
            <QuestionRow
              key={q.id}
              question={q}
              index={i}
              count={questions.length}
              onChange={(patch) => updateQuestion(q.id, patch)}
              onRemove={() => removeQuestion(q.id)}
              onMove={(direction) => moveQuestion(i, direction)}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addQuestion()
              }
            }}
            placeholder="Add a question"
            className="flex-1"
          />
          <Button type="button" variant="secondary" onClick={addQuestion}>
            Add
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setQuestions(getVisionQuestions(horizon))}
          className="self-start text-[12px] font-semibold"
          style={{ color: 'var(--color-eol-accent-label)' }}
        >
          Reset to defaults
        </button>

        <Button type="submit" loading={loading} disabled={questions.length === 0} className="w-full">
          Start the session
        </Button>
      </form>
    </div>
  )
}
