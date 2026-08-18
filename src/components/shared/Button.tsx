import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
  loading?: boolean
}

export function Button({ variant = 'primary', loading, disabled, className = '', children, ...rest }: ButtonProps) {
  const base = 'rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-opacity disabled:opacity-60'
  const style =
    variant === 'primary'
      ? { background: 'var(--color-eol-accent)', color: 'var(--color-eol-ink)' }
      : { background: 'transparent', color: 'var(--color-eol-text-secondary)', border: '1px solid var(--color-eol-border-strong)' }

  return (
    <button className={`${base} ${className}`} style={style} disabled={disabled || loading} {...rest}>
      {loading ? 'Working…' : children}
    </button>
  )
}
