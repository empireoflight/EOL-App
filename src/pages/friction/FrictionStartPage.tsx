import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useTeamMembers } from '../../hooks/useMyTeams'
import { Button } from '../../components/shared/Button'
import { Textarea } from '../../components/shared/Input'
import { Card } from '../../components/shared/Card'
import { TierBadge } from '../../components/shared/TierBadge'

type Selection = { kind: 'just_me' } | { kind: 'whole_team' } | { kind: 'people'; userIds: string[] }
type Step = 'notice' | 'help' | 'who'

const FRICTION_TYPES = ['Vision', 'Relationship', 'Trust', 'Capacity', 'Process', 'Power', 'Unclear direction', 'Something else']

export default function FrictionStartPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: members } = useTeamMembers(teamId)

  const prefillTopic = (location.state as { prefillTopic?: string } | null)?.prefillTopic

  const [step, setStep] = useState<Step>('notice')
  const [topic, setTopic] = useState(prefillTopic ?? '')
  const [frictionType, setFrictionType] = useState<string | null>(null)
  const [selection, setSelection] = useState<Selection>({ kind: 'just_me' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const otherMembers = (members ?? []).filter((m) => m.user_id !== user?.id)

  // Soft nudge, not a block (spec §16): a framing that names someone poisons
  // every answer that follows, since participants read this before their
  // own Phase 1 reflection.
  const mentionsName = useMemo(() => {
    const lower = topic.toLowerCase()
    return otherMembers.some((m) => m.users?.name && lower.includes(m.users.name.toLowerCase()))
  }, [topic, otherMembers])

  const togglePerson = (userId: string) => {
    setSelection((prev) => {
      const current = prev.kind === 'people' ? prev.userIds : []
      const next = current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
      return { kind: 'people', userIds: next }
    })
  }

  const createSession = async (initialSelection: Selection) => {
    if (!supabase || !teamId || !user) return
    setLoading(true)
    setError('')
    try {
      if (initialSelection.kind === 'just_me') {
        navigate(`/teams/${teamId}/friction/mitigate`)
        return
      }

      const { data: session, error: sessionError } = await supabase
        .from('convergence_sessions')
        .insert({
          team_id: teamId,
          session_type: 'friction',
          status: 'collecting',
          initiator_id: user.id,
          framing: { topic, frictionType },
        })
        .select()
        .single()
      if (sessionError) throw sessionError

      const participantIds =
        initialSelection.kind === 'whole_team'
          ? (members ?? []).map((m) => m.user_id)
          : Array.from(new Set([user.id, ...initialSelection.userIds]))

      const { error: participantsError } = await supabase
        .from('session_participants')
        .insert(participantIds.map((userId) => ({ session_id: session.id, user_id: userId })))
      if (participantsError) throw participantsError

      // Fire-and-forget — the session already exists even if the email call fails.
      void supabase.functions.invoke('send-friction-invite-email', { body: { sessionId: session.id } })

      navigate(`/teams/${teamId}/friction/sessions/${session.id}/mitigate`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start.")
    } finally {
      setLoading(false)
    }
  }

  if (step === 'notice') {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-5 px-6 py-10">
        <div>
          <h1 className="m-0 text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            What's getting in the way?
          </h1>
          <p className="m-0 mt-1 text-[13px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
            Misalignment, conflict, uncertainty, burnout — whatever it is, it's information, not failure.
          </p>
        </div>

        <Card>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (topic.trim()) setStep('help')
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center gap-2">
              <TierBadge tier={1} />
              <span className="text-[11px]" style={{ color: 'var(--color-eol-text-faint)' }}>
                Private until you decide who to involve
              </span>
            </div>
            <Textarea
              label="I'm noticing..."
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
                This mentions a teammate by name — consider rephrasing around the situation instead, so their answers aren't shaped by feeling called out.
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
                What kind of friction is this?
              </span>
              <div className="flex flex-wrap gap-2">
                {FRICTION_TYPES.map((t) => (
                  <Chip key={t} label={t} active={frictionType === t} onClick={() => setFrictionType(frictionType === t ? null : t)} />
                ))}
              </div>
            </div>

            <Button type="submit" disabled={!topic.trim()} className="w-full">
              Continue
            </Button>
          </form>
        </Card>
      </div>
    )
  }

  if (step === 'help') {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-5 px-6 py-10">
        <div>
          <h1 className="m-0 text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            What might help right now?
          </h1>
        </div>

        {error && (
          <div className="rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-pink)', color: 'var(--color-eol-pink-strong)' }}>
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <HelpOption
            title="Talk about it"
            description="Start a private processing session with specific people."
            onClick={() => {
              setSelection({ kind: 'people', userIds: [] })
              setStep('who')
            }}
          />
          <HelpOption
            title="Bring it to the team"
            description="Start a private processing session with everyone."
            onClick={() => {
              setSelection({ kind: 'whole_team' })
              setStep('who')
            }}
          />
          <HelpOption
            title="Ground first"
            description="Process this on your own before deciding anything else."
            onClick={() => createSession({ kind: 'just_me' })}
            loading={loading}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-6 py-10">
      <div>
        <h1 className="m-0 text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          Who's this affecting?
        </h1>
      </div>

      <Card>
        {error && (
          <div className="mb-4 rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-pink)', color: 'var(--color-eol-pink-strong)' }}>
            {error}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void createSession(selection)
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex items-center gap-2">
            <TierBadge tier={4} />
            <span className="text-[11px]" style={{ color: 'var(--color-eol-text-faint)' }}>
              Visible only to whoever you include below, once everyone's responded
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {selection.kind !== 'whole_team' &&
                otherMembers.map((m) => (
                  <Chip
                    key={m.user_id}
                    label={m.users?.name ?? '—'}
                    active={selection.kind === 'people' && selection.userIds.includes(m.user_id)}
                    onClick={() => togglePerson(m.user_id)}
                  />
                ))}
              <Chip label="Whole team" active={selection.kind === 'whole_team'} onClick={() => setSelection({ kind: 'whole_team' })} />
            </div>
          </div>

          <p className="m-0 rounded-lg p-3 text-[12px] leading-relaxed" style={{ background: 'var(--color-eol-surface)', color: 'var(--color-eol-text-secondary)' }}>
            This starts private for each person. Nothing is shared until everyone has processed it on their own.
          </p>

          <Button type="submit" loading={loading} className="w-full">
            Bring them in
          </Button>
        </form>
      </Card>
    </div>
  )
}

function HelpOption({
  title,
  description,
  onClick,
  loading,
}: {
  title: string
  description: string
  onClick: () => void
  loading?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex flex-col gap-1 rounded-2xl border p-4 text-left"
      style={{ borderColor: 'var(--color-eol-border)', background: 'var(--color-eol-surface)' }}
    >
      <div className="text-[13.5px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
        {title}
      </div>
      <div className="text-[12px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
        {description}
      </div>
    </button>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3.5 py-1.5 text-[12px] font-medium"
      style={
        active
          ? { background: 'var(--color-tier4-bg)', color: 'var(--color-tier4-fg)' }
          : { border: '1px solid var(--color-eol-border-strong)', color: 'var(--color-eol-text-secondary)' }
      }
    >
      {label}
    </button>
  )
}
