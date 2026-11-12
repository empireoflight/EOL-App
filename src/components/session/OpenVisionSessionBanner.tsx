import { useMyPendingVisionSession, useOpenVisionSession } from '../../hooks/useConvergenceSession'
import { ActionBanner, BannerLink } from '../shared/ActionBanner'

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
      <ActionBanner
        eyebrow="Waiting on you"
        title="You have a vision reflection to complete"
        actions={<BannerLink to={`/teams/${teamId}/vision/sessions/${pendingSession.id}/reflect`}>Submit it &rarr;</BannerLink>}
      />
    )
  }

  if (openSession) {
    return (
      <ActionBanner
        eyebrow="In progress"
        title="Vision creation process is in progress"
        actions={<BannerLink to={`/teams/${teamId}/vision`}>View status &rarr;</BannerLink>}
      />
    )
  }

  return null
}
