import { Link } from 'react-router-dom'
import { useConvergenceSession, useMyPendingFrictionSessions } from '../../hooks/useConvergenceSession'
import { useUserName } from '../../hooks/useUserName'
import { ActionBanner } from '../shared/ActionBanner'
import type { ConvergenceSession } from '../../lib/types'

// One card per session this person still owes a submission to — see
// useMyPendingFrictionSessions' own comment for why this used to collapse
// to a single session and now doesn't. Self-contained (queries its own
// data from just teamId), same reusable-banner pattern as
// OpenVisionSessionBanner.tsx — mounted on both the Unlearn hub and
// Overview.
function PendingFrictionBanner({ teamId, session }: { teamId: string | undefined; session: ConvergenceSession }) {
  const topic = (session.framing as { topic?: string | null }).topic
  const { data: initiatorName } = useUserName(topic ? undefined : session.initiator_id)
  const { data } = useConvergenceSession(session.id)

  return (
    <ActionBanner
      eyebrow="Waiting on you"
      title={topic || (initiatorName ? `Waiting on ${initiatorName} to describe it` : 'Waiting on the initiator to describe it')}
      detail={data ? `${data.submittedCount} of ${data.totalParticipants} collected` : undefined}
      actions={
        <Link to={`/teams/${teamId}/friction/sessions/${session.id}/mitigate`} className="text-[13.5px] font-semibold" style={{ color: 'var(--color-eol-accent-label)' }}>
          Answer it &rarr;
        </Link>
      }
    />
  )
}

export function PendingFrictionBanners({ teamId }: { teamId: string | undefined }) {
  const { data: pendingSessions } = useMyPendingFrictionSessions(teamId)
  if (!pendingSessions || pendingSessions.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {pendingSessions.map((session) => (
        <PendingFrictionBanner key={session.id} teamId={teamId} session={session} />
      ))}
    </div>
  )
}
