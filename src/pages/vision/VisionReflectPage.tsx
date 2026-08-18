import { useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useDurableForm } from '../../hooks/useDurableForm'
import { useConvergenceSession } from '../../hooks/useConvergenceSession'
import { Button } from '../../components/shared/Button'
import { Textarea } from '../../components/shared/Input'
import { Card } from '../../components/shared/Card'
import { TierBadge } from '../../components/shared/TierBadge'
import { getVisionQuestions } from '../../lib/visionQuestions'

export default function VisionReflectPage() {
  const { teamId, sessionId } = useParams<{ teamId: string; sessionId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { data: sessionData } = useConvergenceSession(sessionId)
  const horizon = (sessionData?.session.framing as { horizon?: string } | undefined)?.horizon
  const questions = getVisionQuestions(horizon)

  const { value: answers, setValue: setAnswers, saveState, discard } = useDurableForm<Record<string, string>>({
    formKey: `vision-reflect-${sessionId}`,
    tier: 1,
    initialValue: {},
    userId: user?.id,
  })

  const setAnswer = (id: string) => (ev: React.ChangeEvent<HTMLTextAreaElement>) =>
    setAnswers({ ...answers, [id]: ev.target.value })

  const requiredAnswered = questions.filter((q) => !q.optional).every((q) => answers[q.id]?.trim())

  const handleSubmit = async () => {
    if (!supabase || !teamId || !sessionId || !user) return
    setSubmitting(true)
    setError('')
    try {
      await supabase.from('private_reflections').insert({
        user_id: user.id,
        team_id: teamId,
        session_id: sessionId,
        kind: 'vision_answer',
        content: answers,
      })
      await supabase
        .from('session_participants')
        .update({ submitted_at: new Date().toISOString() })
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
      discard()
      navigate(`/teams/${teamId}/vision/sessions/${sessionId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your answers.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-6 py-10">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <TierBadge tier={1} />
          <span className="text-[11px]" style={{ color: 'var(--color-eol-text-faint)' }}>
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' || saveState === 'local-only' ? 'Saved' : ''}
          </span>
        </div>
        <h1 className="m-0 text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          Your reflection
        </h1>
        <p className="m-0 mt-1 text-[13px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
          Your answers will be visible to your teammates once submitted, alongside the synthesized summary —
          that's what gives the vision its texture.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-pink)', color: 'var(--color-eol-pink-strong)' }}>
          {error}
        </div>
      )}

      {questions.map((q) => (
        <Card key={q.id}>
          <Textarea
            label={q.prompt + (q.optional ? ' (optional)' : '')}
            value={answers[q.id] ?? ''}
            onChange={setAnswer(q.id)}
          />
        </Card>
      ))}

      <Button onClick={handleSubmit} loading={submitting} disabled={!requiredAnswered} className="w-full">
        Submit my reflection
      </Button>
    </div>
  )
}
