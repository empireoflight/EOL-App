import { useAuth } from '../../hooks/useAuth'
import { useTeam, useTeamMembers } from '../../hooks/useMyTeams'
import { useProfileQuestions, useTeamProfiles } from '../../hooks/useTeamProfiles'
import { isProfileComplete } from '../../lib/teamProfiles'
import { ActionBanner, BannerLink } from '../shared/ActionBanner'
import { Avatar } from '../shared/Avatar'

const MAX_FACES = 5

// Overview's doorway into the Team section: faces of whoever's already on the
// board, and a nudge to add yours if you aren't. Renders nothing for a solo
// space (nobody to meet) or until the data's in, so it never flashes empty.
export function TeamBoardTile({ teamId }: { teamId: string }) {
  const { user } = useAuth()
  const { data: team } = useTeam(teamId)
  const { data: members } = useTeamMembers(teamId)
  const { questions, isLoading: questionsLoading } = useProfileQuestions(teamId)
  const { data: profiles } = useTeamProfiles(teamId)

  if (!team || team.is_solo || !members || !profiles || questionsLoading) return null

  const memberIds = new Set(members.map((m) => m.user_id))
  const complete = profiles.filter((p) => memberIds.has(p.user_id) && isProfileComplete(p, questions))
  const iAmOnBoard = complete.some((p) => p.user_id === user?.id)
  const faces = complete.slice(0, MAX_FACES)
  const extra = complete.length - faces.length

  const subline =
    complete.length === 0
      ? 'Be the first to pin a profile to the board.'
      : iAmOnBoard
        ? `${complete.length} of ${members.length} teammates are on the board.`
        : `${complete.length} of ${members.length} teammates are on the board — add yours.`

  return (
    <ActionBanner
      eyebrow="The team"
      title="Meet the team"
      detail={subline}
      leading={
        faces.length > 0 ? (
          <div className="flex items-center">
            {faces.map((p, i) => (
              <span key={p.user_id} className="rounded-full border-2" style={{ borderColor: 'var(--color-eol-surface)', marginLeft: i === 0 ? 0 : -10 }}>
                <Avatar name={p.users?.name ?? 'Teammate'} avatarUrl={p.users?.avatar_url} size={36} />
              </span>
            ))}
            {extra > 0 && (
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 text-[11px] font-semibold"
                style={{ marginLeft: -10, background: 'var(--color-eol-lavender-bg)', color: 'var(--color-eol-lavender-fg)', borderColor: 'var(--color-eol-surface)' }}
              >
                +{extra}
              </span>
            )}
          </div>
        ) : undefined
      }
      actions={<BannerLink to={`/teams/${teamId}/team`}>Open the board &rarr;</BannerLink>}
    />
  )
}
