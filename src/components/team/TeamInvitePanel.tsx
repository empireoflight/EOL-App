import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useTeamMembers } from '../../hooks/useMyTeams'
import { useTeamInvites, useTeamInviteLink, useRegenerateTeamInviteLink } from '../../hooks/useTeamInvites'
import { Button } from '../shared/Button'
import { Input } from '../shared/Input'
import { Card } from '../shared/Card'
import { Avatar } from '../shared/Avatar'

/**
 * Shared invite UI — the standalone Invite page and the vision-start flow's
 * "who's doing this with you?" step both render this, so the two never
 * drift out of sync.
 */
export function TeamInvitePanel({ teamId }: { teamId: string }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: members } = useTeamMembers(teamId)
  const { data: invites } = useTeamInvites(teamId)
  const { data: inviteLink } = useTeamInviteLink(teamId)
  const regenerateLink = useRegenerateTeamInviteLink(teamId)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)

  const createInvite = useMutation({
    mutationFn: async (inviteEmail: string) => {
      if (!supabase || !teamId || !user) throw new Error('Not ready')
      const { data, error } = await supabase
        .from('team_invites')
        .insert({ team_id: teamId, email: inviteEmail, invited_by: user.id })
        .select('id')
        .single()
      if (error) throw error
      // Non-blocking: the invite (and its shareable link) already exists
      // and works even if sending the notification email fails.
      void supabase.functions.invoke('send-team-invite-email', { body: { inviteId: data.id } })
    },
    onSuccess: () => {
      setEmail('')
      queryClient.invalidateQueries({ queryKey: ['team-invites', teamId] })
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Couldn't create invite."),
  })

  const inviteUrl = (token: string) => `${window.location.origin}/invite/${token}`
  const joinUrl = (token: string) => `${window.location.origin}/join/${token}`
  // Mirrors the RLS policy on team_invites (facilitators only) — a member
  // hitting "Invite" would otherwise just get a generic insert failure with
  // no clue why, since they can't even read the pending-invites list either.
  const canInvite = members?.find((m) => m.user_id === user?.id)?.team_role === 'facilitator'

  const copyLink = () => {
    if (!inviteLink) return
    navigator.clipboard.writeText(joinUrl(inviteLink.token))
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4">
      {canInvite ? (
        <Card>
          {error && (
            <div className="mb-3 text-[12.5px]" style={{ color: 'var(--color-eol-pink-strong)' }}>
              {error}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setError('')
              createInvite.mutate(email)
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1">
              <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" loading={createInvite.isPending}>
              Invite
            </Button>
          </form>
        </Card>
      ) : null}

      {canInvite ? (
        <Card>
          <div className="mb-1 text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
            Or share an invite link
          </div>
          <p className="m-0 mb-3 text-[12.5px]" style={{ color: 'var(--color-eol-text-faint)' }}>
            Anyone with this link can join the team — no need to know their email up front.
          </p>
          {inviteLink ? (
            <div className="flex items-center gap-2">
              <div
                className="flex-1 truncate rounded-lg border px-3 py-2 text-[12.5px]"
                style={{ borderColor: 'var(--color-eol-border-strong)', background: 'var(--color-eol-surface-light)', color: 'var(--color-eol-text-secondary)' }}
              >
                {joinUrl(inviteLink.token)}
              </div>
              <Button variant="secondary" onClick={copyLink}>
                {linkCopied ? 'Copied!' : 'Copy link'}
              </Button>
              <Button variant="secondary" onClick={() => regenerateLink.mutate()} loading={regenerateLink.isPending}>
                Regenerate
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => regenerateLink.mutate()} loading={regenerateLink.isPending}>
              Get invite link
            </Button>
          )}
          {regenerateLink.isError && (
            <p className="m-0 mt-2 text-[12.5px]" style={{ color: 'var(--color-eol-pink-strong)' }}>
              {regenerateLink.error instanceof Error ? regenerateLink.error.message : "Couldn't create the invite link."}
            </p>
          )}
        </Card>
      ) : (
        <Card>
          <p className="m-0 text-[12.5px]" style={{ color: 'var(--color-eol-text-faint)' }}>
            Only your team's facilitator can invite new members.
          </p>
        </Card>
      )}

      {invites && invites.length > 0 && (
        <Card>
          <div className="mb-3 text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
            Pending invites
          </div>
          <div className="flex flex-col gap-2">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                <span style={{ color: 'var(--color-eol-text-secondary)' }}>{invite.email}</span>
                <button
                  type="button"
                  className="rounded-md border px-2.5 py-1 text-[11px]"
                  style={{ borderColor: 'var(--color-eol-border-strong)', color: 'var(--color-eol-text-muted)' }}
                  onClick={() => navigator.clipboard.writeText(inviteUrl(invite.token))}
                >
                  Copy link
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="mb-3 text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
          Team members
        </div>
        <div className="flex flex-col gap-3">
          {(members ?? []).map((m) => (
            <div key={m.user_id} className="flex items-center gap-3">
              <Avatar name={m.users?.name ?? '?'} avatarUrl={m.users?.avatar_url} />
              <div className="text-[13px]" style={{ color: 'var(--color-eol-text)' }}>
                {m.users?.name}
                {m.team_role === 'facilitator' && (
                  <span className="ml-2 text-[11px]" style={{ color: 'var(--color-eol-text-faint)' }}>
                    facilitator
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
