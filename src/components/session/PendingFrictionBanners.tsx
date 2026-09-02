import { Link } from 'react-router-dom'
import { useConvergenceSession, useMyPendingFrictionSessions } from '../../hooks/useConvergenceSession'
import { useUserName } from '../../hooks/useUserName'
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
    <Link
      to={`/teams/${teamId}/friction/sessions/${session.id}/mitigate`}
      className="flex items-center gap-4 rounded-2xl border p-4"
      style={{ background: 'var(--color-eol-accent)', borderColor: 'var(--color-eol-border-strong)' }}
    >
      <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: 'var(--color-eol-accent-hover)' }} />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-eol-accent-hover)' }}>
          Waiting on you
        </div>
        <div className="truncate text-[15px] font-semibold leading-snug" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-ink)' }}>
          {topic || (initiatorName ? `Waiting on ${initiatorName} to describe it` : 'Waiting on the initiator to describe it')}
        </div>
        {data && (
          <div className="text-[12.5px]" style={{ color: 'var(--color-eol-ink)', opacity: 0.65 }}>
            {data.submittedCount} of {data.totalParticipants} collected
          </div>
        )}
      </div>
      <span className="shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold" style={{ background: 'var(--color-eol-ink)', color: 'var(--color-eol-bg)' }}>
        Answer it &rarr;
      </span>
    </Link>
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
