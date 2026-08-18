import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/shared/Button'
import { Card } from '../components/shared/Card'
import { Logo } from '../components/shared/Logo'
import { LoadingScreen } from '../components/shared/LoadingScreen'

type InvitePreview = {
  id: string
  team_id: string
  team_name: string
  email: string
  status: string
  created_at: string
}

export default function InviteLandingPage() {
  const { token } = useParams<{ token: string }>()
  const { session, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [invite, setInvite] = useState<InvitePreview | null | undefined>(undefined)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase || !token) return
    supabase
      .rpc('get_team_invite', { p_token: token })
      .single<InvitePreview>()
      .then(({ data }) => setInvite(data ?? null))
  }, [token])

  const handleAccept = async () => {
    if (!supabase || !token || !invite) return
    setAccepting(true)
    setError('')
    try {
      await supabase.rpc('accept_team_invite', { p_token: token }).throwOnError()
      navigate(`/teams/${invite.team_id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't accept this invite.")
    } finally {
      setAccepting(false)
    }
  }

  if (authLoading || invite === undefined) return <LoadingScreen />

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo size={36} />
        </div>

        {!invite ? (
          <Card>
            <p className="m-0 text-[13.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
              This invite link isn't valid — it may have already been used.
            </p>
          </Card>
        ) : (
          <Card>
            <h1 className="m-0 mb-2 text-[20px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
              Join {invite.team_name}
            </h1>
            <p className="m-0 mb-5 text-[13px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
              Invited as {invite.email}
            </p>
            {error && (
              <div className="mb-4 rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-pink)', color: 'var(--color-eol-pink-strong)' }}>
                {error}
              </div>
            )}
            {session ? (
              <Button onClick={handleAccept} loading={accepting} className="w-full">
                Accept invite
              </Button>
            ) : (
              <div className="flex flex-col gap-2">
                <Link to="/signup" state={{ from: { pathname: `/invite/${token}` } }}>
                  <Button className="w-full">Create an account to join</Button>
                </Link>
                <Link to="/login" state={{ from: { pathname: `/invite/${token}` } }}>
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
