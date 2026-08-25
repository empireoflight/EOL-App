import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/shared/Button'
import { Card } from '../components/shared/Card'
import { Logo } from '../components/shared/Logo'
import { LoadingScreen } from '../components/shared/LoadingScreen'
import { Seo } from '../components/shared/Seo'

type LinkPreview = {
  team_id: string
  team_name: string
  status: string
}

// Accept flow for the reusable, non-email-bound invite link (TeamInvitePanel's
// "share an invite link" — get_team_invite_link_preview / accept_team_invite_link).
// Mirrors InviteLandingPage.tsx's structure, minus the "invited as {email}" line
// and the email-match check that page's accept RPC enforces — this link isn't
// addressed to anyone in particular and stays usable for the next person too.
export default function JoinTeamPage() {
  const { token } = useParams<{ token: string }>()
  const { session, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [preview, setPreview] = useState<LinkPreview | null | undefined>(undefined)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase || !token) return
    supabase
      .rpc('get_team_invite_link_preview', { p_token: token })
      .single<LinkPreview>()
      .then(({ data }) => setPreview(data ?? null))
  }, [token])

  const handleAccept = async () => {
    if (!supabase || !token || !preview) return
    setAccepting(true)
    setError('')
    try {
      await supabase.rpc('accept_team_invite_link', { p_token: token }).throwOnError()
      navigate(`/teams/${preview.team_id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join this team.")
    } finally {
      setAccepting(false)
    }
  }

  if (authLoading || preview === undefined) return <LoadingScreen />

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <Seo title="Join your team | Empire of Light" description="Join an Empire of Light team via invite link." path={`/join/${token ?? ''}`} origin="app" noindex />
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo size={36} />
        </div>

        {!preview ? (
          <Card>
            <p className="m-0 text-[13.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
              This invite link isn't valid — it may have been revoked or replaced.
            </p>
          </Card>
        ) : (
          <Card>
            <h1 className="m-0 mb-2 text-[20px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
              Join {preview.team_name}
            </h1>
            <p className="m-0 mb-5 text-[13px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
              You've been invited via a shared link.
            </p>
            {error && (
              <div className="mb-4 rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-pink)', color: 'var(--color-eol-pink-strong)' }}>
                {error}
              </div>
            )}
            {session ? (
              <Button onClick={handleAccept} loading={accepting} className="w-full">
                Join team
              </Button>
            ) : (
              <div className="flex flex-col gap-2">
                <Link to="/signup" state={{ from: { pathname: `/join/${token}` } }}>
                  <Button className="w-full">Create an account to join</Button>
                </Link>
                <Link to="/login" state={{ from: { pathname: `/join/${token}` } }}>
                  <Button variant="secondary" className="w-full">
                    I already have an account
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
