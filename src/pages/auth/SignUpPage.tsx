import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/shared/Button'
import { Input } from '../../components/shared/Input'
import { Logo } from '../../components/shared/Logo'

export default function SignUpPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signUp(form)
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/teams'
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create an account.")
    } finally {
      setLoading(false)
    }
  }

  const set = (field: keyof typeof form) => (ev: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: ev.target.value }))

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo size={36} />
          <h1
            className="m-0 text-[28px] font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}
          >
            Create your account
          </h1>
        </div>

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
      </div>
    </div>
  )
}
