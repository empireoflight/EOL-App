import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/shared/Button'
import { Input } from '../../components/shared/Input'
import { AuthShell } from '../../components/shared/AuthShell'
import { Seo } from '../../components/shared/Seo'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setLoading(true)
    setError('')
    try {
      await resetPassword(email)
      // Show the same confirmation regardless of whether the email is
      // registered — resetPasswordForEmail() doesn't reveal that either,
      // and doing so here would let this form be used to check who has an
      // account.
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the reset email.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Reset your password" titleSize={26}>
      <Seo title="Reset your password | Empire of Light" description="Request a password reset link." path="/forgot-password" origin="app" noindex />
      <div className="rounded-2xl border p-6" style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border)' }}>
        {sent ? (
          <p className="m-0 text-center text-[13.5px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
            If an account exists for <strong style={{ color: 'var(--color-eol-text)' }}>{email}</strong>, we've sent a link to reset your
            password.
          </p>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-pink)', color: 'var(--color-eol-pink-strong)' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button type="submit" loading={loading} className="w-full">
                Send reset link
              </Button>
            </form>
          </>
        )}
        <p className="mt-5 text-center text-[13px]" style={{ color: 'var(--color-eol-text-muted)' }}>
          <Link to="/login" className="font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
