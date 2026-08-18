import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useTeamVision } from '../../hooks/useVision'
import { useDurableForm } from '../../hooks/useDurableForm'
import { FRICTION_AUTHORED_QUESTIONS } from '../../lib/frictionQuestions'
import { Button } from '../../components/shared/Button'
import { Textarea } from '../../components/shared/Input'
import { Card } from '../../components/shared/Card'
import { TierBadge } from '../../components/shared/TierBadge'
import { FrictionTopicSummary } from '../../components/session/FrictionTopicSummary'

type AuthoredAnswers = { problem_summary: string; hopes: string; what_matters: string }

export default function FrictionRespondPage() {
  const { teamId, sessionId } = useParams<{ teamId: string; sessionId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: vision } = useTeamVision(teamId)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { value: answers, setValue: setAnswers, discard } = useDurableForm<AuthoredAnswers>({
    formKey: `friction-respond-${sessionId}`,
    tier: 4,
    initialValue: { problem_summary: '', hopes: '', what_matters: '' },
    userId: user?.id,
  })

  const setAnswer = (id: keyof AuthoredAnswers) => (ev: React.ChangeEvent<HTMLTextAreaElement>) =>
    setAnswers({ ...answers, [id]: ev.target.value })

  const allAnswered = FRICTION_AUTHORED_QUESTIONS.every((q) => answers[q.id]?.trim())

  const northStar = vision?.layout.nodes.find((n) => n.kind === 'north_star')

  const handleSubmit = async () => {
    if (!supabase || !sessionId || !user) return
    setSubmitting(true)
    setError('')
    try {
      const { error: responseError } = await supabase.from('friction_session_responses').insert({
        session_id: sessionId,
        user_id: user.id,
        ...answers,
      })
      if (responseError) throw responseError

      const { error: participantError } = await supabase
        .from('session_participants')
        .update({ submitted_at: new Date().toISOString() })
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
      if (participantError) throw participantError

      // Only the one submission that completes the readiness gate gets
      // `true` back — see migration 20260818050000 for why this can't be a
      // client-side count check.
      const { data: justCompleted } = await supabase.rpc('claim_session_completion', { p_session_id: sessionId })
      if (justCompleted) {
        void supabase.functions.invoke('send-friction-discussion-ready-email', { body: { sessionId } })
      }

      discard()
      navigate(`/teams/${teamId}/friction/sessions/${sessionId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-6 py-10">
      <FrictionTopicSummary sessionId={sessionId} />

      {northStar && (
        <Card className="text-center">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-pink-strong)' }}>
            Here's what your team said you're building
          </div>
          <div className="text-[16px] leading-snug" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            {northStar.text}
          </div>
        </Card>
      )}

      <div>
        <h1 className="m-0 text-[20px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          Your point of view
        </h1>
        <p className="m-0 mt-1 text-[13px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
          These answers will be shared, once everyone has submitted theirs — never before.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-pink)', color: 'var(--color-eol-pink-strong)' }}>
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <TierBadge tier={4} />
      </div>

      {FRICTION_AUTHORED_QUESTIONS.map((q) => (
        <Textarea key={q.id} label={q.prompt} value={answers[q.id]} onChange={setAnswer(q.id)} />
      ))}

      <Button onClick={handleSubmit} loading={submitting} disabled={!allAnswered} className="w-full">
        Submit my point of view
      </Button>
    </div>
  )
}
