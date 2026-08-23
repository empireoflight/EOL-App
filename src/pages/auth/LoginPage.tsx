import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/shared/Button'
import { Input } from '../../components/shared/Input'
import { Logo } from '../../components/shared/Logo'
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
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <Seo title="Sign in | Empire of Light" description="Sign in to your Empire of Light team." path="/login" origin="app" noindex />
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo size={36} />
          <h1
            className="m-0 text-[28px] font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}
          >
            Welcome back
          </h1>
        </div>

        <div className="rounded-2xl border p-6" style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border)' }}>
          {error && (
            <div className="mb-4 rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-pink)', color: 'var(--color-eol-pink-strong)' }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input label="Email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
            <Input label="Password" type="password" autoComplete="current-password" required value={form.password} onChange={set('password')} />
            <Button type="submit" loading={loading} className="w-full">
              Sign in
            </Button>
          </form>
          <p className="mt-3 text-center text-[12.5px]">
            <Link to="/forgot-password" style={{ color: 'var(--color-eol-text-muted)' }}>
              Forgot your password?
            </Link>
          </p>
          <p className="mt-3 text-center text-[13px]" style={{ color: 'var(--color-eol-text-muted)' }}>
            New here?{' '}
            <Link to="/signup" className="font-medium">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
