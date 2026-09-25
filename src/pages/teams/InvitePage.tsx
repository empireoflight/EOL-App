import { useParams } from 'react-router-dom'
import { TeamInvitePanel } from '../../components/team/TeamInvitePanel'
import { PageHeader } from '../../components/shared/PageHeader'

export default function InvitePage() {
  const { teamId } = useParams<{ teamId: string }>()
  if (!teamId) return null

  return (
    <>
      <PageHeader title="Invite teammates" />
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
        <TeamInvitePanel teamId={teamId} />
      </div>
    </>
  )
}
