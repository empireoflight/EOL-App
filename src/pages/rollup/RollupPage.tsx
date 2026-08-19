import { useParams } from 'react-router-dom'
import { useTeamMembers } from '../../hooks/useMyTeams'
import { LoadingScreen } from '../../components/shared/LoadingScreen'
import { TeamRollup } from './TeamRollup'
import { SoloRollup } from './SoloRollup'

export default function RollupPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { data: members, isLoading } = useTeamMembers(teamId)

  if (isLoading) return <LoadingScreen />

  // "Solo" is inferred from team_members count, not a stored flag — matches
  // this schema's existing "no solo-specific tables" stance and stays
  // correct even for a real team that temporarily has 1 member while
  // invites are pending.
  const isSolo = (members ?? []).length <= 1

  return isSolo ? <SoloRollup teamId={teamId as string} /> : <TeamRollup teamId={teamId as string} />
}
