import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/shared/Button'
import { Input } from '../../components/shared/Input'
import { Logo } from '../../components/shared/Logo'
import { Seo } from '../../components/shared/Seo'
import { LoadingScreen } from '../../components/shared/LoadingScreen'

// Landed on directly from the recovery email's link — its token is picked
// up automatically by detectSessionInUrl (src/lib/supabase.ts), which
// establishes a temporary session and populates `user` below via
// AuthProvider's onAuthStateChange listener. No `user` yet by the time this
// mounts means the link was invalid, already used, or expired.
export default function ResetPasswordPage() {
  const { user, loading, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setError('')
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    setSubmitting(true)
    try {
      await updatePassword(password)
      navigate('/teams', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update your password.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <Seo title="Set a new password | Empire of Light" description="Choose a new password for your account." path="/auth/reset-password" origin="app" noindex />
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo size={36} />
          <h1 className="m-0 text-[26px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            Set a new password
          </h1>
        </div>

        <div className="rounded-2xl border p-6" style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border)' }}>
          {!user ? (
            <>
              <p className="m-0 mb-4 text-[13.5px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
                This link is invalid or has expired. Request a new one to reset your password.
              </p>
              <Link to="/forgot-password">
                <Button className="w-full">Request a new link</Button>
              </Link>
            </>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-pink)', color: 'var(--color-eol-pink-strong)' }}>
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
                <Button type="submit" loading={submitting} className="w-full">
                  Update password
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
