import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useTeamVision } from '../../hooks/useVision'
import { useDurableForm } from '../../hooks/useDurableForm'
import { useConvergenceSession } from '../../hooks/useConvergenceSession'
import { useTeamMembers } from '../../hooks/useMyTeams'
import { FRICTION_AUTHORED_QUESTIONS, FRICTION_TYPES } from '../../lib/frictionQuestions'
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
  const { data: sessionData } = useConvergenceSession(sessionId)
  const { data: members } = useTeamMembers(teamId)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // The initiator writes the shared situation description here, after
  // grounding, now that who's involved is already known (moved from the old
  // pre-who 'notice' step in FrictionStartPage.tsx). Everyone else just
  // reads it via FrictionTopicSummary, same as before.
  const existingTopic = (sessionData?.session.framing as { topic?: string | null } | undefined)?.topic
  const isInitiator = !!user && sessionData?.session.initiator_id === user.id
  const needsSituationDescription = isInitiator && !existingTopic

  const [topic, setTopic] = useState('')
  const [frictionType, setFrictionType] = useState<string | null>(null)
  const otherMembers = (members ?? []).filter((m) => m.user_id !== user?.id)
  const mentionsName = useMemo(() => {
    const lower = topic.toLowerCase()
    return otherMembers.some((m) => m.users?.name && lower.includes(m.users.name.toLowerCase()))
  }, [topic, otherMembers])

  const { value: answers, setValue: setAnswers, discard } = useDurableForm<AuthoredAnswers>({
    formKey: `friction-respond-${sessionId}`,
    tier: 4,
    initialValue: { problem_summary: '', hopes: '', what_matters: '' },
    userId: user?.id,
  })

  const setAnswer = (id: keyof AuthoredAnswers) => (ev: React.ChangeEvent<HTMLTextAreaElement>) =>
    setAnswers({ ...answers, [id]: ev.target.value })

  const allAnswered = FRICTION_AUTHORED_QUESTIONS.every((q) => answers[q.id]?.trim()) && (!needsSituationDescription || topic.trim())

  const northStar = vision?.layout.nodes.find((n) => n.kind === 'north_star')

  const handleSubmit = async () => {
    if (!supabase || !sessionId || !user) return
    setSubmitting(true)
    setError('')
    try {
      if (needsSituationDescription) {
        const { error: framingError } = await supabase
          .from('convergence_sessions')
          .update({ framing: { ...(sessionData?.session.framing ?? {}), topic: topic.trim(), frictionType } })
          .eq('id', sessionId)
        if (framingError) throw framingError
      }

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

      {needsSituationDescription && (
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <TierBadge tier={4} />
            <span className="text-[11px]" style={{ color: 'var(--color-eol-text-faint)' }}>
              Visible to whoever you brought into this session
            </span>
          </div>
          <div className="flex flex-col gap-4">
            <Textarea
              label="Describe the situation"
              hint="Describe the situation neutrally — e.g. 'how we make decisions in standup,' not who did what. Naming someone here colors every answer that follows."
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            {mentionsName && (
              <div
                className="rounded-lg border px-3 py-2 text-[12px]"
                style={{ borderColor: 'var(--color-tier2-dot)', color: 'var(--color-tier2-fg)', background: 'var(--color-tier2-bg)' }}
              >
                This mentions a teammate by name — consider rephrasing around the situation instead, so their answers
                aren't shaped by feeling called out.
              </div>
            )}
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
                What kind of friction is this?
              </span>
              <div className="flex flex-wrap gap-2">
                {FRICTION_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFrictionType(frictionType === t ? null : t)}
                    className="rounded-full px-3.5 py-1.5 text-[12px] font-medium"
                    style={
                      frictionType === t
                        ? { background: 'var(--color-tier4-bg)', color: 'var(--color-tier4-fg)' }
                        : { border: '1px solid var(--color-eol-border-strong)', color: 'var(--color-eol-text-secondary)' }
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

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
