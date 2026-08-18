import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/shared/Button'
import { Input } from '../../components/shared/Input'
import { Logo } from '../../components/shared/Logo'
import type { Organization, Team } from '../../lib/types'

// A signed-in session whose profile row no longer exists (deleted directly
// in the database, or a dev-environment reset) trips this specific
// foreign-key violation on the first privileged write. There's no in-app
// fix for the account itself — the fix is a fresh sign-in — so this gets a
// distinct, actionable message instead of the generic one.
function isStaleSessionError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '23503'
}

export default function CreateOrgPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [orgName, setOrgName] = useState('')
  const [teamName, setTeamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [staleSession, setStaleSession] = useState(false)

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!supabase) return
    setLoading(true)
    setError('')
    setStaleSession(false)
    try {
      const { data: org, error: orgError } = await supabase
        .rpc('create_organization', { p_name: orgName })
        .single<Organization>()
      if (orgError) throw orgError

      const { data: team, error: teamError } = await supabase
        .rpc('create_team', { p_org_id: org.id, p_name: teamName })
        .single<Team>()
      if (teamError) throw teamError

      navigate(`/teams/${team.id}`, { replace: true })
    } catch (err) {
      if (isStaleSessionError(err)) {
        setStaleSession(true)
        setError('Your session is out of date — sign out and sign back in to fix this.')
      } else {
        setError(err instanceof Error ? err.message : "Couldn't create your team.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo size={36} />
          <h1 className="m-0 text-[26px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            Set up your team
          </h1>
          <p className="m-0 text-[13px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
            This creates your organization and your first pilot team together.
          </p>
        </div>

        <div className="rounded-2xl border p-6" style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border)' }}>
          {error && (
            <div className="mb-4 flex flex-col gap-2 rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-pink)', color: 'var(--color-eol-pink-strong)' }}>
              <span>{error}</span>
              {staleSession && (
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="self-start font-semibold underline"
                >
                  Sign out
                </button>
              )}
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input label="Organization name" placeholder="Lumen" required value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            <Input label="Team name" placeholder="Lumen Product Team" required value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            <Button type="submit" loading={loading} className="w-full">
              Create team
            </Button>
          </form>
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 block w-full text-center text-[12px]"
          style={{ color: 'var(--color-eol-text-muted)' }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
