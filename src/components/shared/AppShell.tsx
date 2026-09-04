import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useMyTeams, useTeamMembers } from '../../hooks/useMyTeams'
import { useMyPendingInvites } from '../../hooks/useTeamInvites'
import { Logo } from './Logo'
import { Button } from './Button'
import { Avatar } from './Avatar'

type NavItem = {
  label: string
  to: string
  /** Overview sits at the team root — every sub-page's path also starts
   *  with that prefix, so it needs an exact match instead of startsWith. */
  exact?: boolean
}

function navItemsFor(teamId: string): NavItem[] {
  return [
    { label: 'Overview', to: `/teams/${teamId}/overview`, exact: true },
    { label: 'Reimagine', to: `/teams/${teamId}/vision` },
    { label: 'Do', to: `/teams/${teamId}/experiments` },
    { label: 'Unlearn', to: `/teams/${teamId}/friction` },
    { label: 'Evolve', to: `/teams/${teamId}/rollup` },
  ]
}

// Deterministic per-team swatch color, same hashing approach Avatar.tsx
// uses for per-person color.
const TEAM_PALETTE = ['oklch(0.82 0.08 55)', 'oklch(0.80 0.07 220)', 'oklch(0.80 0.09 150)', 'oklch(0.82 0.09 320)', 'oklch(0.80 0.10 90)']
function teamColorFor(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return TEAM_PALETTE[hash % TEAM_PALETTE.length]
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 5.5H17M3 10H17M3 14.5H17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

// Opens over the current team's dashboard rather than navigating away —
// picking a team or closing it just gets you back to what you were doing.
function TeamSwitcher({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: teams } = useMyTeams()
  const { data: pendingInvites } = useMyPendingInvites()
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  const goToTeam = (id: string) => {
    onClose()
    navigate(`/teams/${id}`)
  }

  const handleAccept = async (token: string, invitedTeamId: string) => {
    if (!supabase) return
    setAcceptingId(token)
    try {
      await supabase.rpc('accept_team_invite', { p_token: token }).throwOnError()
      queryClient.invalidateQueries({ queryKey: ['my-teams'] })
      queryClient.invalidateQueries({ queryKey: ['my-pending-invites'] })
      goToTeam(invitedTeamId)
    } finally {
      setAcceptingId(null)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute left-0 top-full z-50 mt-1.5 flex w-full flex-col gap-1 rounded-2xl border p-2 shadow-lg"
        style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border)' }}
      >
        <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-text-faint)' }}>
          Switch team
        </div>

        {pendingInvites && pendingInvites.length > 0 && (
          <div className="mb-1 flex flex-col gap-1 border-b pb-2" style={{ borderColor: 'var(--color-eol-border)' }}>
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2">
                <div className="min-w-0 flex-1 truncate text-[12.5px]" style={{ color: 'var(--color-eol-text)' }}>
                  Invited to <span className="font-semibold">{invite.team_name}</span>
                </div>
                <Button onClick={() => handleAccept(invite.token, invite.team_id)} loading={acceptingId === invite.token}>
                  Accept
                </Button>
              </div>
            ))}
          </div>
        )}

        {(teams ?? []).map((team) => {
          const active = team.id === teamId
          return (
            <button
              key={team.id}
              type="button"
              onClick={() => goToTeam(team.id)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium"
              style={{ background: active ? 'var(--color-tier2-bg)' : 'transparent', color: 'var(--color-eol-text)' }}
            >
              <span className="h-3.5 w-3.5 shrink-0 rounded" style={{ background: teamColorFor(team.id) }} />
              <span className="min-w-0 flex-1 truncate">{team.name}</span>
              {active && (
                <span className="shrink-0" style={{ color: 'var(--color-tier2-fg)' }}>
                  &#10003;
                </span>
              )}
            </button>
          )
        })}

        <div className="mt-1 border-t pt-2" style={{ borderColor: 'var(--color-eol-border)' }}>
          <Link
            to="/onboarding"
            onClick={onClose}
            className="block rounded-lg px-2.5 py-2 text-[13px] font-medium"
            style={{ color: 'var(--color-eol-text-muted)' }}
          >
            + Create a team
          </Link>
        </div>
      </div>
    </>
  )
}

type SidebarContentProps = {
  teamId: string
  teamName: string
  onNavigate?: () => void
}

// Shared between the always-visible desktop rail and the mobile drawer, so
// the two don't drift. `h-full` + `overflow-y-auto` on the wrapper (not a
// viewport unit) keeps the user row pinned to the bottom of whatever
// container it's placed in, without ever pushing past its own fold on long
// pages — the parent decides how tall that container actually is.
function SidebarContent({ teamId, teamName, onNavigate }: SidebarContentProps) {
  const location = useLocation()
  const { signOut, profile } = useAuth()
  const [switcherOpen, setSwitcherOpen] = useState(false)

  return (
    <div className="flex h-full flex-col overflow-y-auto py-4">
      <div className="flex items-center gap-2.5 px-4 pb-4">
        <Logo size={26} />
        <span className="text-[14px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          Empire of Light
        </span>
      </div>
      <div className="h-px shrink-0" style={{ background: 'var(--color-eol-border)' }} />

      <div className="relative shrink-0 px-3 py-3">
        <button
          type="button"
          onClick={() => setSwitcherOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-text-faint)' }}>
              Team
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="h-3.5 w-3.5 shrink-0 rounded" style={{ background: teamColorFor(teamId) }} />
              <span className="truncate text-[13.5px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
                {teamName}
              </span>
            </div>
          </div>
          <span style={{ color: 'var(--color-eol-text-muted)' }}>
            <ChevronIcon />
          </span>
        </button>
        {switcherOpen && (
          <TeamSwitcher
            teamId={teamId}
            onClose={() => {
              setSwitcherOpen(false)
              onNavigate?.()
            }}
          />
        )}
      </div>
      <div className="mx-3 h-px shrink-0" style={{ background: 'var(--color-eol-border)' }} />

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-3">
        {navItemsFor(teamId).map((item) => {
          const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to)
          return (
            <Link
              key={item.label}
              to={item.to}
              onClick={onNavigate}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-[14px]"
              style={{
                background: active ? 'var(--color-tier2-bg)' : 'transparent',
                color: active ? 'var(--color-tier2-fg)' : 'var(--color-eol-text-muted)',
                fontWeight: active ? 600 : 500,
              }}
            >
              {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-tier2-dot)' }} />}
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto shrink-0 border-t px-4 pt-3" style={{ borderColor: 'var(--color-eol-border)' }}>
        <Link to={`/teams/${teamId}/profile`} onClick={onNavigate} className="flex items-center gap-2.5">
          <Avatar name={profile?.name ?? '?'} avatarUrl={profile?.avatar_url} size={28} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium" style={{ color: 'var(--color-eol-text)' }}>
            {profile?.name}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-1.5 text-[11px]"
          style={{ color: 'var(--color-eol-text-faint)' }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

type AppShellProps = {
  teamId: string
  teamName: string
  children: ReactNode
}

export function AppShell({ teamId, teamName, children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { user } = useAuth()
  const { data: members } = useTeamMembers(teamId)
  // Mirrors the RLS policy on team_invites (facilitators only) — see
  // TeamInvitePanel.tsx for the same check on the page this links to.
  const canInvite = members?.find((m) => m.user_id === user?.id)?.team_role === 'facilitator'

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className="hidden w-[240px] shrink-0 border-r md:block"
        style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border)' }}
      >
        <SidebarContent teamId={teamId} teamName={teamName} />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setMobileNavOpen(false)} />
          <div
            className="relative flex h-full w-[260px] flex-col border-r"
            style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border)' }}
          >
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-3 rounded-lg p-1.5"
              style={{ color: 'var(--color-eol-text-muted)' }}
            >
              <CloseIcon />
            </button>
            <SidebarContent teamId={teamId} teamName={teamName} onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex h-14 shrink-0 items-center justify-between border-b px-5"
          style={{ background: 'var(--gradient-dawn)', borderColor: 'var(--color-eol-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
              className="-ml-1.5 rounded-lg p-1.5 md:hidden"
              style={{ color: 'var(--color-eol-text)' }}
            >
              <MenuIcon />
            </button>
            <span className="text-[15px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
              {teamName}
            </span>
          </div>
          <nav className="flex gap-4 text-[12.5px] font-medium" style={{ color: 'var(--color-eol-text)' }}>
            <Link to={`/teams/${teamId}/pulse`}>Vibe check</Link>
            {canInvite && <Link to={`/teams/${teamId}/invite`}>Invite</Link>}
          </nav>
        </header>
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
