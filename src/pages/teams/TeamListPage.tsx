import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useMyTeams } from '../../hooks/useMyTeams'
import { useMyPendingInvites } from '../../hooks/useTeamInvites'
import { useAuth } from '../../hooks/useAuth'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { Logo } from '../../components/shared/Logo'
import { LoadingScreen } from '../../components/shared/LoadingScreen'

export default function TeamListPage() {
  const { data: teams, isLoading } = useMyTeams()
  const { data: pendingInvites } = useMyPendingInvites()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleAccept = async (token: string, teamId: string) => {
    if (!supabase) return
    setAcceptingId(token)
    setError('')
    try {
      await supabase.rpc('accept_team_invite', { p_token: token }).throwOnError()
      queryClient.invalidateQueries({ queryKey: ['my-teams'] })
      queryClient.invalidateQueries({ queryKey: ['my-pending-invites'] })
      navigate(`/teams/${teamId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't accept this invite.")
    } finally {
      setAcceptingId(null)
    }
  }

  if (isLoading) return <LoadingScreen />

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size={32} />
          <h1 className="m-0 text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            Your teams
          </h1>
        </div>
        <button type="button" onClick={() => void signOut()} className="text-[12.5px]" style={{ color: 'var(--color-eol-text-muted)' }}>
          Sign out
        </button>
      </div>

      {error && (
        <div className="rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-pink)', color: 'var(--color-eol-pink-strong)' }}>
          {error}
        </div>
      )}

      {pendingInvites && pendingInvites.length > 0 && (
        <div className="flex flex-col gap-3">
          {pendingInvites.map((invite) => (
            <Card key={invite.id}>
              <div className="flex items-center justify-between gap-4">
                <div className="text-[13.5px]" style={{ color: 'var(--color-eol-text)' }}>
                  You're invited to <span className="font-semibold">{invite.team_name}</span>
                </div>
                <Button onClick={() => handleAccept(invite.token, invite.team_id)} loading={acceptingId === invite.token}>
                  Accept
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {teams && teams.length > 0 ? (
        <div className="flex flex-col gap-3">
          {teams.map((team) => (
            <Link key={team.id} to={`/teams/${team.id}`}>
              <Card className="transition-opacity hover:opacity-80">
                <div className="text-[15px] font-medium" style={{ color: 'var(--color-eol-text)' }}>
                  {team.name}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        !pendingInvites?.length && (
          <Card>
            <p className="m-0 mb-4 text-[13.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
              You're not on a team yet.
            </p>
          </Card>
        )
      )}

      <Link to="/onboarding">
        <Button variant="secondary" className="w-full">
          + Create a team
        </Button>
      </Link>
    </div>
  )
}
