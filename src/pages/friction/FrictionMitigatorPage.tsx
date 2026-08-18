import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useConvergenceSession } from '../../hooks/useConvergenceSession'
import { useDurableForm } from '../../hooks/useDurableForm'
import { FRICTION_STAGES, frictionQuestionsForStage, type FrictionStage } from '../../lib/frictionQuestions'
import { Button } from '../../components/shared/Button'
import { Textarea } from '../../components/shared/Input'
import { TierBadge } from '../../components/shared/TierBadge'
import { FrictionTopicSummary } from '../../components/session/FrictionTopicSummary'
import { useState } from 'react'

export default function FrictionMitigatorPage() {
  const { teamId, sessionId } = useParams<{ teamId: string; sessionId?: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: sessionData } = useConvergenceSession(sessionId)
  const [stageIndex, setStageIndex] = useState(0)
  const stage: FrictionStage = FRICTION_STAGES[stageIndex].id

  const variant = (sessionData?.totalParticipants ?? 0) > 2 ? 'team' : 'two_person'

  // Tier 0: never networked, formKey namespaced per session (or per team for
  // the solo path) — see src/hooks/useDurableForm.ts's local-only path.
  // userId still scopes the *local* storage key (not sent anywhere) so this
  // session-scoped key can't leak one participant's grounding notes to the
  // next person who opens it on the same browser.
  const { value: answers, setValue: setAnswers, discard } = useDurableForm<Record<string, string>>({
    formKey: `friction-mitigate-${sessionId ?? `solo-${teamId}`}`,
    tier: 0,
    initialValue: {},
    userId: user?.id,
  })

  const setAnswer = (id: string) => (ev: React.ChangeEvent<HTMLTextAreaElement>) =>
    setAnswers({ ...answers, [id]: ev.target.value })

  const questions = frictionQuestionsForStage(stage)
  const stageComplete = questions.every((q) => answers[q.id]?.trim())

  const handleNext = () => {
    if (stageIndex < FRICTION_STAGES.length - 1) {
      setStageIndex(stageIndex + 1)
      return
    }
    // Done with all 7 tier-0 questions — nothing to send, there's nothing
    // stored server-side to discard from, but this also clears localStorage
    // now that the participant is done with this material.
    discard()
    if (sessionId) {
      navigate(`/teams/${teamId}/friction/sessions/${sessionId}/respond`)
    } else {
      navigate(`/teams/${teamId}/friction/tools`)
    }
  }

  const handleExit = () => {
    navigate(`/teams/${teamId}`)
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 px-6 py-10">
      <div>
        <div className="mb-1 text-[11px]" style={{ color: 'var(--color-eol-text-muted)' }}>
          Do &middot; Friction Mitigator
        </div>
        <h1 className="m-0 text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          {stage === 'ground' ? "Let's ground first" : stage === 'reflect' ? 'Reflect' : 'Clarify needs'}
        </h1>
      </div>

      {sessionId && <FrictionTopicSummary sessionId={sessionId} />}

      <div className="flex gap-1.5">
        {FRICTION_STAGES.map((s, i) => (
          <div
            key={s.id}
            className="h-1 flex-1 rounded-full"
            style={{ background: i <= stageIndex ? 'var(--color-eol-accent)' : 'var(--color-eol-border-strong)' }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10.5px]" style={{ color: 'var(--color-eol-text-muted)' }}>
        {FRICTION_STAGES.map((s, i) => (
          <span key={s.id} style={i === stageIndex ? { color: 'var(--color-eol-accent-hover)', fontWeight: 600 } : undefined}>
            {s.label}
          </span>
        ))}
      </div>

      {stage === 'ground' && (
        <div className="flex flex-col items-center gap-4 py-3">
          <div
            className="h-28 w-28 rounded-full"
            style={{ background: 'radial-gradient(circle, #fff0c0, #ffb3e6)', animation: 'breathe 4s ease-in-out infinite' }}
          />
          <p className="m-0 max-w-xs text-center text-[13.5px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
            Take three slow breaths before we start. There's no rush — this space is just for you right now.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <TierBadge tier={0} />
      </div>

      {questions.map((q) => (
        <Textarea key={q.id} label={q.prompt[variant]} value={answers[q.id] ?? ''} onChange={setAnswer(q.id)} />
      ))}

      <p className="m-0 text-[11.5px]" style={{ color: 'var(--color-eol-text-faint)' }}>
        This stays on your device. It is never sent anywhere, never saved to any server, and no one — including your
        team or Empire of Light — can ever see it.
      </p>

      <div className="mt-auto flex flex-col gap-2.5">
        <Button onClick={handleNext} disabled={!stageComplete} className="w-full">
          {stageIndex < FRICTION_STAGES.length - 1 ? `Next: ${FRICTION_STAGES[stageIndex + 1].label}` : 'Continue'}
        </Button>
        <button type="button" onClick={handleExit} className="text-center text-[12.5px]" style={{ color: 'var(--color-eol-text-muted)' }}>
          Exit for now
        </button>
      </div>
    </div>
  )
}
