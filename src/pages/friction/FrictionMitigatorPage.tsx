import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useConvergenceSession } from '../../hooks/useConvergenceSession'
import { useDurableForm } from '../../hooks/useDurableForm'
import { useTeamMembers } from '../../hooks/useMyTeams'
import { FRICTION_STAGES, frictionQuestionsForStage, type FrictionStage } from '../../lib/frictionQuestions'
import { Button } from '../../components/shared/Button'
import { Textarea } from '../../components/shared/Input'
import { TierBadge } from '../../components/shared/TierBadge'
import { LoadingScreen } from '../../components/shared/LoadingScreen'
import { Card } from '../../components/shared/Card'
import { FrictionTopicSummary } from '../../components/session/FrictionTopicSummary'
import { CancelFrictionSessionButton } from '../../components/session/CancelFrictionSessionButton'
import { useState } from 'react'

export default function FrictionMitigatorPage() {
  const { teamId, sessionId } = useParams<{ teamId: string; sessionId?: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: sessionData, isLoading: sessionLoading } = useConvergenceSession(sessionId)
  const { data: members } = useTeamMembers(teamId)
  const [stageIndex, setStageIndex] = useState(0)
  const [finishing, setFinishing] = useState(false)
  const [soloDone, setSoloDone] = useState(false)
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

  const handleNext = async () => {
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
      return
    }
    // Solo path: the answers themselves never leave this device (see the
    // notice below), but a bare, content-free timestamp is recorded so this
    // completion can count toward the weekly "friction processed" number on
    // the Evolve page — see friction_grounding_completions' table comment.
    if (supabase && teamId && user) {
      setFinishing(true)
      await supabase.from('friction_grounding_completions').insert({ user_id: user.id, team_id: teamId })
      setFinishing(false)
    }
    // A brief confirmation here rather than dropping someone straight into
    // another moment — grounding just finished, it shouldn't feel like the
    // app is pushing the next thing on them.
    setSoloDone(true)
  }

  const handleExit = () => {
    navigate(`/teams/${teamId}`)
  }

  // Every question in this flow ("what happened from your perspective?",
  // "what do you feel in your body right now?"...) presupposes you already
  // know what "this" refers to. An invited participant has nothing to
  // anchor those to until the initiator has grounded themselves and
  // written the shared topic (FrictionRespondPage) — so wait for it here
  // rather than asking someone to reflect on a situation they can't see.
  // The initiator themselves is never blocked — they're the one writing it.
  if (sessionId && sessionLoading) return <LoadingScreen />
  const isInitiator = sessionData?.session.initiator_id === user?.id
  const topic = (sessionData?.session.framing as { topic?: string } | undefined)?.topic
  const waitingOnTopic = !!sessionId && !isInitiator && !topic

  // The initiator's own grounding page otherwise has zero indication of who
  // this session is even with — FrictionTopicSummary intentionally renders
  // nothing until the topic exists (it's the initiator who's about to write
  // it), which left this screen looking identical to solo grounding with no
  // sense that a real conversation was started. Names, not just a count:
  // spec §16's "never who has/hasn't submitted" is about hiding progress
  // from *other* participants, not hiding from the initiator the list of
  // people they personally chose to invite.
  const otherParticipantNames =
    isInitiator && sessionData
      ? sessionData.participants
          .filter((p) => p.user_id !== user?.id)
          .map((p) => members?.find((m) => m.user_id === p.user_id)?.users?.name)
          .filter((name): name is string => !!name)
      : []

  if (waitingOnTopic) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-5 px-6 py-16 text-center">
        <div
          className="h-16 w-16 rounded-full"
          style={{ background: 'radial-gradient(circle, #fff0c0, #ffb3e6)', animation: 'breathe 4s ease-in-out infinite' }}
        />
        <div>
          <h1 className="m-0 text-[20px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            Not quite ready yet
          </h1>
          <p className="m-0 mt-1.5 text-[13.5px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
            Whoever brought you into this is still grounding themselves and describing what it's about. Check back in
            a bit — there's nothing for you to do here until they have.
          </p>
        </div>
        <Button onClick={handleExit} variant="secondary" className="w-full">
          Back for now
        </Button>
      </div>
    )
  }

  if (soloDone) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-5 px-6 py-16 text-center">
        <div
          className="h-16 w-16 rounded-full"
          style={{ background: 'radial-gradient(circle, #fff0c0, #ffb3e6)' }}
        />
        <div>
          <h1 className="m-0 text-[20px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            Nice work
          </h1>
          <p className="m-0 mt-1.5 text-[13.5px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
            That's counted toward this week's friction processed — the answers themselves were never sent anywhere.
          </p>
        </div>
        <Button onClick={() => navigate(`/teams/${teamId}/friction`)} className="w-full">
          Back to Unlearn
        </Button>
      </div>
    )
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

      {sessionId && !topic && otherParticipantNames.length > 0 && (
        <Card>
          <p className="m-0 text-[12.5px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
            You're bringing this to{' '}
            <span className="font-semibold" style={{ color: 'var(--color-eol-text)' }}>
              {otherParticipantNames.join(', ')}
            </span>
            . Ground yourself first — you'll describe what it's about next.
          </p>
        </Card>
      )}
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
        <Button onClick={() => void handleNext()} disabled={!stageComplete} loading={finishing} className="w-full">
          {stageIndex < FRICTION_STAGES.length - 1 ? `Next: ${FRICTION_STAGES[stageIndex + 1].label}` : 'Continue'}
        </Button>
        <button type="button" onClick={handleExit} className="text-center text-[12.5px]" style={{ color: 'var(--color-eol-text-muted)' }}>
          Exit for now
        </button>
        {sessionId && teamId && isInitiator && !topic && <CancelFrictionSessionButton teamId={teamId} sessionId={sessionId} />}
      </div>
    </div>
  )
}
