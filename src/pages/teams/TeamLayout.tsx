import { Outlet, useParams } from 'react-router-dom'
import { useTeam } from '../../hooks/useMyTeams'
import { AppShell } from '../../components/shared/AppShell'
import { LoadingScreen } from '../../components/shared/LoadingScreen'

export default function TeamLayout() {
  const { teamId } = useParams<{ teamId: string }>()
  const { data: team, isLoading } = useTeam(teamId)

  if (isLoading || !team) return <LoadingScreen />

  return (
    <AppShell teamId={team.id} teamName={team.name}>
      <Outlet />
    </AppShell>
  )
}
