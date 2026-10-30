import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useTeam, useTeamMembers } from '../../hooks/useMyTeams'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { PageHeader } from '../../components/shared/PageHeader'
import { LoadingScreen } from '../../components/shared/LoadingScreen'
import { ProfileQuestionEditor } from '../../components/team/ProfileQuestionEditor'
import { useProfileQuestions, useSaveProfileQuestions } from '../../hooks/useTeamProfiles'
import { useSetTeamReminders } from '../../hooks/useTeamReminders'

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

function RemindersSection({ teamId, enabled }: { teamId: string; enabled: boolean }) {
  const setReminders = useSetTeamReminders(teamId)

  return (
    <Card>
      <button
        type="button"
        onClick={() => setReminders.mutate(!enabled)}
        disabled={setReminders.isPending}
        role="switch"
        aria-checked={enabled}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <div>
          <div className="text-[13.5px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
            Reminder emails
          </div>
          <p className="m-0 mt-0.5 text-[12px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
            The Friday vibe check and due-date reminders, for everyone on this team. Turn off to pause them. Invites and other emails aren't affected.
          </p>
        </div>
        <span className="relative h-6 w-11 shrink-0 rounded-full transition-colors" style={{ background: enabled ? 'var(--color-eol-accent)' : 'var(--color-eol-border-strong)' }}>
          <span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
            style={{ left: 2, transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
          />
        </span>
      </button>
      {setReminders.isError && (
        <p className="m-0 mt-2 text-[12px]" style={{ color: 'var(--color-eol-pink-strong)' }}>
          {setReminders.error instanceof Error ? setReminders.error.message : "Couldn't update reminder emails."}
        </p>
      )}
    </Card>
  )
}

function ProfileQuestionsSection({ teamId }: { teamId: string }) {
  const { questions, updatedAt, isLoading } = useProfileQuestions(teamId)
  const save = useSaveProfileQuestions(teamId)

  return (
    <Card>
      <div className="mb-3 text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
        Profile questions
      </div>
      {isLoading ? (
        <p className="m-0 text-[12.5px]" style={{ color: 'var(--color-eol-text-faint)' }}>
          Loading…
        </p>
      ) : (
        <ProfileQuestionEditor
          key={updatedAt ?? 'defaults'}
          saved={questions}
          onSave={(next) => save.mutate(next)}
          saving={save.isPending}
          error={save.isError ? (save.error instanceof Error ? save.error.message : "Couldn't save the questions.") : undefined}
        />
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
    <>
      <PageHeader title="Team settings" />
      <div className="mx-auto flex max-w-xl flex-col gap-6 px-6 py-10">
        {!canManage ? (
          <Card>
            <p className="m-0 text-[12.5px]" style={{ color: 'var(--color-eol-text-faint)' }}>
              Only your team's facilitator can manage team settings.
            </p>
          </Card>
        ) : (
          <>
            <RemindersSection teamId={teamId as string} enabled={team?.reminders_enabled ?? true} />
            {!team?.is_solo && <ProfileQuestionsSection teamId={teamId as string} />}
            <DeleteTeamSection teamId={teamId as string} teamName={team?.name ?? 'this team'} />
          </>
        )}
      </div>
    </>
  )
}
