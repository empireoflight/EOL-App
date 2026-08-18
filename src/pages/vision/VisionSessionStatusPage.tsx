import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useConvergenceSession, useSynthesisJobPolling } from '../../hooks/useConvergenceSession'
import { ReadinessBanner } from '../../components/session/ReadinessBanner'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { Avatar } from '../../components/shared/Avatar'
import { LoadingScreen } from '../../components/shared/LoadingScreen'

function useSessionVision(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-vision', sessionId],
    queryFn: async (): Promise<{ status: 'draft' | 'pending_commitment' | 'committed' } | null> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase.from('visions').select('status').eq('session_id', sessionId as string).maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!sessionId,
  })
}

export default function VisionSessionStatusPage() {
  const { teamId, sessionId } = useParams<{ teamId: string; sessionId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data, isLoading, refetch } = useConvergenceSession(sessionId)
  const { data: vision } = useSessionVision(sessionId)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)

  const jobQuery = useSynthesisJobPolling(sessionId, data?.session.status)

  if (isLoading || !data) return <LoadingScreen />

  const { session, participants, submittedCount, totalParticipants, gateMet, participantNames } = data
  const isFacilitator = session.initiator_id === user?.id
  const myParticipant = participants.find((p) => p.user_id === user?.id)
  const isLocked = vision?.status === 'committed' || vision?.status === 'pending_commitment'

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
      setError(err instanceof Error ? err.message : "Couldn't start synthesis.")
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-6 py-10">
      <h1 className="m-0 text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
        Vision session
      </h1>

      {error && (
        <div className="rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-pink)', color: 'var(--color-eol-pink-strong)' }}>
          {error}
        </div>
      )}

      {myParticipant && !myParticipant.submitted_at && (
        <Card>
          <p className="m-0 mb-3 text-[13.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
            You haven't submitted your reflection yet.
          </p>
          <Button onClick={() => navigate(`/teams/${teamId}/vision/sessions/${sessionId}/reflect`)} className="w-full">
            Submit your reflection
          </Button>
        </Card>
      )}

      {session.status === 'guide_ready' && (
        <Card>
          <p className="m-0 mb-4 text-[13.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
            The vision guide is ready.
          </p>
          <Button onClick={() => navigate(`/teams/${teamId}/vision`)} className="w-full">
            Open the vision canvas
          </Button>
        </Card>
      )}

      {isLocked ? (
        <Card>
          <p className="m-0 text-[13px]" style={{ color: 'var(--color-eol-text-faint)' }}>
            {vision?.status === 'committed'
              ? 'This vision has been committed — open the vision page to revise it.'
              : "This vision is pending everyone's commitment — open the vision page to check progress."}
          </p>
          <Link to={`/teams/${teamId}/vision`} className="mt-3 inline-block text-[12.5px] font-semibold" style={{ color: 'var(--color-eol-accent-label)' }}>
            Open the vision page &rarr;
          </Link>
        </Card>
      ) : (
        <>
          <ReadinessBanner
            submittedCount={submittedCount}
            totalParticipants={totalParticipants}
            gateMet={gateMet}
            isFacilitator={isFacilitator}
            onGenerate={handleGenerate}
            generating={starting || session.status === 'synthesizing' || jobQuery.data?.status === 'running'}
            regenerate={session.status === 'guide_ready'}
          />
          {Object.keys(participantNames).length > 0 && (
            <Card>
              <div className="flex flex-wrap gap-3">
                {Object.entries(participantNames).map(([id, name]) => (
                  <div key={id} className="flex items-center gap-2">
                    <Avatar name={name} size={26} />
                    <span className="text-[12px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
