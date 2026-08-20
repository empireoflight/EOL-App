import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useTeamMembers } from '../../hooks/useMyTeams'
import { Button } from '../../components/shared/Button'
import { Card } from '../../components/shared/Card'
import { TierBadge } from '../../components/shared/TierBadge'

type Selection = { kind: 'just_me' } | { kind: 'whole_team' } | { kind: 'people'; userIds: string[] }

// Who comes first now (spec §16 revision): describing the situation while
// you already know who'll read it is more honest than writing it "private"
// and then deciding — see FrictionRespondPage.tsx, where the situation
// description now lives, written after grounding.
export default function FrictionStartPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: members } = useTeamMembers(teamId)

  const prefillTopic = (location.state as { prefillTopic?: string } | null)?.prefillTopic

  const [selection, setSelection] = useState<Selection>({ kind: 'just_me' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const otherMembers = (members ?? []).filter((m) => m.user_id !== user?.id)

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

      // topic/frictionType aren't known yet — the initiator writes them in
      // FrictionRespondPage, after grounding, once the audience is already
      // locked in. prefillTopic (from RollupPage's "Explore this ->" link)
      // is the one exception: it's already known here, so seed it now.
      const { data: session, error: sessionError } = await supabase
        .from('convergence_sessions')
        .insert({
          team_id: teamId,
          session_type: 'friction',
          status: 'collecting',
          initiator_id: user.id,
          framing: { topic: prefillTopic ?? null },
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

      // Fire-and-forget — the session already exists even if the email call
      // fails. The email itself already handles a not-yet-written topic.
      void supabase.functions.invoke('send-friction-invite-email', { body: { sessionId: session.id } })

      navigate(`/teams/${teamId}/friction/sessions/${session.id}/mitigate`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-6 py-10">
      <div>
        <h1 className="m-0 text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          Who's this affecting?
        </h1>
        <p className="m-0 mt-1 text-[13px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
          Ground yourself first either way — bring in specific people, the whole team, or just process this on your
          own.
        </p>
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
          {selection.kind === 'just_me' ? (
            <div className="flex items-center gap-2">
              <TierBadge tier={0} />
              <span className="text-[11px]" style={{ color: 'var(--color-eol-text-faint)' }}>
                Never sent anywhere — just for you
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <TierBadge tier={4} />
              <span className="text-[11px]" style={{ color: 'var(--color-eol-text-faint)' }}>
                Visible to whoever you include below, once you've grounded and described the situation
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Chip label="Just me" active={selection.kind === 'just_me'} onClick={() => setSelection({ kind: 'just_me' })} />
            {otherMembers.map((m) => (
              <Chip
                key={m.user_id}
                label={m.users?.name ?? '—'}
                active={selection.kind === 'people' && selection.userIds.includes(m.user_id)}
                onClick={() => togglePerson(m.user_id)}
              />
            ))}
            {otherMembers.length > 0 && (
              <Chip label="Whole team" active={selection.kind === 'whole_team'} onClick={() => setSelection({ kind: 'whole_team' })} />
            )}
          </div>

          <Button type="submit" loading={loading} className="w-full">
            {selection.kind === 'just_me' ? 'Ground first' : 'Bring them in'}
          </Button>
        </form>
      </Card>
    </div>
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
