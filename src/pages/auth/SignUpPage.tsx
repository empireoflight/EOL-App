import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/shared/Button'
import { Input } from '../../components/shared/Input'
import { AuthShell } from '../../components/shared/AuthShell'
import { Seo } from '../../components/shared/Seo'

export default function SignUpPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)

  // A plain signup lands on "create a team" (there's nothing else to do
  // yet); signing up to accept an invite carries the invite page here as
  // `from`, so that's honored instead.
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/onboarding'

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { session } = await signUp({ ...form, redirectPath: from })
      if (session) {
        // Confirmations disabled (local dev) — already signed in.
        navigate(from, { replace: true })
      } else {
        setAwaitingConfirmation(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create an account.")
    } finally {
      setLoading(false)
    }
  }

  const set = (field: keyof typeof form) => (ev: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: ev.target.value }))

  if (awaitingConfirmation) {
    return (
      <AuthShell title="Check your email">
        <Seo title="Check your email | Empire of Light" description="Confirm your Empire of Light account." path="/signup" origin="app" noindex />
        <div className="rounded-2xl border p-6 text-center" style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border)' }}>
          <p className="m-0 text-[13.5px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
            We sent a confirmation link to <strong>{form.email}</strong>. Click it to finish setting up your
            account — you'll land right back here, signed in.
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Create your account">
      <Seo title="Create your account | Empire of Light" description="Create your Empire of Light account." path="/signup" origin="app" noindex />
      <div className="rounded-2xl border p-6" style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border)' }}>
        {error && (
          <div className="mb-4 rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-pink)', color: 'var(--color-eol-pink-strong)' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Name" autoComplete="name" required value={form.name} onChange={set('name')} />
          <Input label="Email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
          <Input label="Password" type="password" autoComplete="new-password" required minLength={6} value={form.password} onChange={set('password')} />
          <Button type="submit" loading={loading} className="w-full">
            Create account
          </Button>
        </form>
        <p className="mt-5 text-center text-[13px]" style={{ color: 'var(--color-eol-text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-medium">
            Sign in
          </Link>
        </p>
      </div>
      <p className="mt-5 text-center text-[12px]" style={{ color: 'var(--color-eol-on-dark-muted)' }}>
        By creating an account, you agree to our{' '}
        <a
          href="https://www.empireoflightcollective.com/privacy"
          target="_blank"
          rel="noreferrer"
          className="font-medium"
          style={{ color: 'var(--color-eol-heading-on-dark)' }}
        >
          Privacy Policy
        </a>
        .
      </p>
    </AuthShell>
  )
}
