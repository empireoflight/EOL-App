import { Link } from 'react-router-dom'
import { useMyPendingVisionSession, useOpenVisionSession } from '../../hooks/useConvergenceSession'

// Either "you personally have a reflection to submit" (most actionable, so
// checked first) or, failing that, "a session is already open" (so nobody
// hits "Start a vision session" and spawns a redundant parallel one). Shown
// on both the vision canvas and the team's Overview page, so a pending
// reflection surfaces without having to open the Reimagine tab first.
export function OpenVisionSessionBanner({ teamId }: { teamId: string | undefined }) {
  const { data: pendingSession } = useMyPendingVisionSession(teamId)
  const { data: openSession } = useOpenVisionSession(teamId)

  if (pendingSession) {
    return (
      <Link
        to={`/teams/${teamId}/vision/sessions/${pendingSession.id}/reflect`}
        className="flex items-center justify-between gap-3 rounded-2xl border p-4"
        style={{ background: 'var(--color-tier2-bg)', borderColor: 'var(--color-eol-border)' }}
      >
        <div className="text-[13.5px] font-semibold" style={{ color: 'var(--color-tier2-fg)' }}>
          You have a vision reflection to complete
        </div>
        <span className="shrink-0 text-[12.5px] font-semibold" style={{ color: 'var(--color-tier2-fg)' }}>
          Submit it &rarr;
        </span>
      </Link>
    )
  }

  if (openSession) {
    return (
      <Link
        to={`/teams/${teamId}/vision/sessions/${openSession.id}`}
        className="flex items-center justify-between gap-3 rounded-2xl border p-4"
        style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border)' }}
      >
        <div className="text-[13.5px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
          A vision session is already in progress
        </div>
        <span className="shrink-0 text-[12.5px] font-semibold" style={{ color: 'var(--color-eol-text-muted)' }}>
          View status &rarr;
        </span>
      </Link>
    )
  }

  return null
}
