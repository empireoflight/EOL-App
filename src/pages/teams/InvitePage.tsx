import { useParams } from 'react-router-dom'
import { TeamInvitePanel } from '../../components/team/TeamInvitePanel'

export default function InvitePage() {
  const { teamId } = useParams<{ teamId: string }>()
  if (!teamId) return null

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="m-0 text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
        Invite teammates
      </h1>
      <TeamInvitePanel teamId={teamId} />
    </div>
  )
}
