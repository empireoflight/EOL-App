import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useConvergenceSession, useSynthesisJobPolling } from '../../hooks/useConvergenceSession'
import { ReadinessBanner } from '../../components/session/ReadinessBanner'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { TierBadge } from '../../components/shared/TierBadge'
import { LoadingScreen } from '../../components/shared/LoadingScreen'
import { FRICTION_AUTHORED_QUESTIONS } from '../../lib/frictionQuestions'

type FrictionResponse = {
  id: string
  user_id: string
  problem_summary: string
  hopes: string
  what_matters: string
}

function useFrictionResponses(sessionId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['friction-responses', sessionId],
    queryFn: async (): Promise<FrictionResponse[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('friction_session_responses')
        .select('*')
        .eq('session_id', sessionId as string)
      if (error) throw error
      return data
    },
    enabled: !!sessionId && enabled,
  })
}

// Purpose-built, not reused from useConvergenceSession's participantNames —
// that stays empty for friction sessions on purpose (spec §16: never expose
// who has/hasn't submitted). By the time the discussion guide exists, the
// submission gate has already passed and everyone in the conversation
// already knows who else is in it (they picked each other) — this is just
// surfacing that shared context for the "who to invite" message, not a new
// leak of submission status.
function useFrictionParticipantNames(sessionId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['friction-participant-names', sessionId],
    queryFn: async (): Promise<Record<string, string>> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data: participants, error: participantsError } = await supabase
        .from('session_participants')
        .select('user_id')
        .eq('session_id', sessionId as string)
      if (participantsError) throw participantsError
      if (!participants.length) return {}
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', participants.map((p) => p.user_id))
      if (usersError) throw usersError
      return Object.fromEntries((users ?? []).map((u) => [u.id, u.name]))
    },
    enabled: !!sessionId && enabled,
  })
}

function joinNames(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

export default function FrictionSessionStatusPage() {
  const { sessionId } = useParams<{ teamId: string; sessionId: string }>()
  const { user } = useAuth()
  const { data, isLoading, refetch } = useConvergenceSession(sessionId)
  const { data: responses } = useFrictionResponses(sessionId, !!data?.session.discussion_guide)
  const { data: participantNames } = useFrictionParticipantNames(sessionId, !!data?.session.discussion_guide)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [copied, setCopied] = useState(false)

  const jobQuery = useSynthesisJobPolling(sessionId, data?.session.status)

  if (isLoading || !data) return <LoadingScreen />

  const { session, submittedCount, totalParticipants, gateMet } = data
  const isFacilitator = session.initiator_id === user?.id

  const handleGenerate = async () => {
    if (!supabase || !sessionId) return
    setStarting(true)
    setError('')
    try {
      const { data: job, error: jobError } = await supabase
        .from('synthesis_jobs')
        .insert({ session_id: sessionId })
        .select()
        .single()
      if (jobError) throw jobError

      await supabase.from('convergence_sessions').update({ status: 'synthesizing' }).eq('id', sessionId)

      const { data: authData } = await supabase.auth.getSession()
      const { error: invokeError } = await supabase.functions.invoke('process-synthesis-job', {
        body: { jobId: job.id },
        headers: { Authorization: `Bearer ${authData.session?.access_token}` },
      })
      if (invokeError) throw invokeError

      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate the discussion guide.")
    } finally {
      setStarting(false)
    }
  }

  const handleMarkDiscussed = async () => {
    if (!supabase || !sessionId) return
    setCompleting(true)
    setError('')
    try {
      await supabase.from('convergence_sessions').update({ status: 'discussed' }).eq('id', sessionId)
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't mark this as discussed.")
    } finally {
      setCompleting(false)
    }
  }

  const handleCopyForCalendar = async () => {
    if (!session.discussion_guide) return
    const lines = ['Discussion guide', session.discussion_guide.summary, '', 'Talking points:']
    session.discussion_guide.talkingPoints.forEach((point) => lines.push(`- ${point}`))
    if (responses && responses.length > 0) {
      lines.push('', 'What was shared:')
      responses.forEach((r, i) => {
        if (i > 0) lines.push('---')
        FRICTION_AUTHORED_QUESTIONS.forEach((q) => lines.push(`${q.prompt} ${r[q.id]}`))
      })
    }
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-6 py-10">
      <h1 className="m-0 text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
        Friction session
      </h1>

      {error && (
        <div className="rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-pink)', color: 'var(--color-eol-pink-strong)' }}>
          {error}
        </div>
      )}

      {/* Count only — never who has or hasn't submitted (spec §16). */}
      {!session.discussion_guide && (
        <ReadinessBanner
          submittedCount={submittedCount}
          totalParticipants={totalParticipants}
          gateMet={gateMet}
          isFacilitator={isFacilitator}
          onGenerate={handleGenerate}
          generating={starting || session.status === 'synthesizing' || jobQuery.data?.status === 'running'}
        />
      )}

      {session.discussion_guide && responses && responses.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <TierBadge tier={4} />
            <span className="text-[12.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
              Everyone has submitted — here's what was shared.
            </span>
          </div>
          {responses.map((r) => (
            <Card key={r.id}>
              {FRICTION_AUTHORED_QUESTIONS.map((q) => (
                <div key={q.id} className="mb-3 last:mb-0">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-accent-label)' }}>
                    {q.prompt}
                  </div>
                  <p className="m-0 text-[13px] leading-relaxed" style={{ color: 'var(--color-eol-text)' }}>
                    {r[q.id]}
                  </p>
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}

      {session.discussion_guide && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <TierBadge tier={4} />
            <span className="text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
              Discussion guide
            </span>
          </div>
          <Card>
            <p className="m-0 mb-3 text-[13px] leading-relaxed" style={{ color: 'var(--color-eol-text)' }}>
              {session.discussion_guide.summary}
            </p>
            <ul className="m-0 flex flex-col gap-1.5 pl-4 text-[12.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
              {session.discussion_guide.talkingPoints.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </Card>

          <Card>
            {session.status === 'discussed' ? (
              <p className="m-0 text-[13px] font-medium" style={{ color: 'var(--color-eol-text)' }}>
                This has been talked through — nice work.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="m-0 text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
                  {(() => {
                    const others = Object.entries(participantNames ?? {})
                      .filter(([id]) => id !== user?.id)
                      .map(([, name]) => name)
                    return others.length > 0
                      ? `Schedule this with ${joinNames(others)} to talk it through.`
                      : 'Schedule time to talk it through.'
                  })()}
                </p>
                <Button variant="secondary" onClick={handleCopyForCalendar} className="w-full">
                  {copied ? 'Copied!' : 'Copy for calendar invite'}
                </Button>
                {isFacilitator && (
                  <Button onClick={handleMarkDiscussed} loading={completing} className="w-full">
                    Call has been completed
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
