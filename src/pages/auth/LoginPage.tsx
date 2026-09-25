import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/shared/Button'
import { Input } from '../../components/shared/Input'
import { AuthShell } from '../../components/shared/AuthShell'
import { Seo } from '../../components/shared/Seo'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signIn(form)
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/teams'
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign in.")
    } finally {
      setLoading(false)
    }
  }

  const set = (field: 'email' | 'password') => (ev: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: ev.target.value }))

  return (
    <AuthShell title="Welcome back">
      <Seo title="Sign in | Empire of Light" description="Sign in to your Empire of Light team." path="/login" origin="app" noindex />
      <div className="rounded-2xl border p-6" style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border)' }}>
        {error && (
          <div className="mb-4 rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-pink)', color: 'var(--color-eol-pink-strong)' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
          <label className="flex flex-col gap-1.5 text-left">
            <span className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium" style={{ color: 'var(--color-eol-text-muted)' }}>
                Password
              </span>
              <Link to="/forgot-password" className="text-[12px] font-medium" style={{ color: 'var(--color-eol-accent-label)' }}>
                Forgot password?
              </Link>
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={set('password')}
              className="rounded-lg border px-3 py-2.5 text-[13px] outline-none"
              style={{ borderColor: 'var(--color-eol-border-strong)', background: 'var(--color-eol-surface-light)', color: 'var(--color-eol-text)' }}
            />
          </label>
          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>
        <p className="mt-3 text-center text-[13px]" style={{ color: 'var(--color-eol-text-muted)' }}>
          New here?{' '}
          <Link to="/signup" className="font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
