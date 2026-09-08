import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useTeam, useTeamMembers } from '../../hooks/useMyTeams'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { LoadingScreen } from '../../components/shared/LoadingScreen'

// Two-step reveal-then-confirm, same shape as
// CancelFrictionSessionButton.tsx — the one other destructive-confirmation
// flow in the app.
function DeleteTeamSection({ teamId, teamName }: { teamId: string; teamName: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (!supabase) return
    setDeleting(true)
    setError('')
    try {
      const { error: deleteError } = await supabase.from('teams').delete().eq('id', teamId)
      if (deleteError) throw deleteError
      queryClient.invalidateQueries({ queryKey: ['my-teams'] })
      navigate('/teams')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete this team.")
      setDeleting(false)
    }
  }

  return (
    <Card>
      <div className="mb-3 text-[13px] font-semibold" style={{ color: 'var(--color-eol-pink-strong)' }}>
        Danger zone
      </div>
      {!confirming ? (
        <button type="button" onClick={() => setConfirming(true)} className="text-[12.5px]" style={{ color: 'var(--color-eol-text-faint)' }}>
          Delete this team
        </button>
      ) : (
        <div className="flex flex-col gap-2.5 rounded-lg border px-3.5 py-3" style={{ borderColor: 'var(--color-eol-pink)' }}>
          <p className="m-0 text-[12.5px]" style={{ color: 'var(--color-eol-pink-strong)' }}>
            Delete {teamName}? Every experiment, vision, friction session, and check-in for this team is gone with
            it, along with everyone's membership. This can't be undone.
          </p>
          {error && (
            <p className="m-0 text-[12px]" style={{ color: 'var(--color-eol-pink-strong)' }}>
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void handleDelete()} loading={deleting} className="flex-1">
              Yes, delete
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)} className="flex-1">
              No, keep this team
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

export default function TeamSettingsPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { user } = useAuth()
  const { data: team, isLoading: teamLoading } = useTeam(teamId)
  const { data: members, isLoading: membersLoading } = useTeamMembers(teamId)

  if (teamLoading || membersLoading) return <LoadingScreen />

  // Mirrors the RLS policy on teams (facilitators only) — see
  // TeamInvitePanel.tsx for the same check on invites.
  const canManage = members?.find((m) => m.user_id === user?.id)?.team_role === 'facilitator'

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-6 py-10">
      <h1 className="m-0 text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
        Team settings
      </h1>

      {!canManage ? (
        <Card>
          <p className="m-0 text-[12.5px]" style={{ color: 'var(--color-eol-text-faint)' }}>
            Only your team's facilitator can manage team settings.
          </p>
        </Card>
      ) : (
        <DeleteTeamSection teamId={teamId as string} teamName={team?.name ?? 'this team'} />
      )}
    </div>
  )
}
