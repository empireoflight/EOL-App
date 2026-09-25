import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost-on-dark'
  loading?: boolean
}

// 'secondary' assumes a light background (dark text, no fill) — unusable
// inside PageHeader's dark hero. 'ghost-on-dark' is that same "quiet
// secondary action" role, restated for a dark background, per the mockup's
// header-action spec (e.g. "Regenerate vision" on the vision canvas).
export function Button({ variant = 'primary', loading, disabled, className = '', children, ...rest }: ButtonProps) {
  const base = 'rounded-[10px] px-4 py-2.5 text-[13px] font-semibold transition-opacity disabled:opacity-60'
  const style =
    variant === 'primary'
      ? { background: 'var(--color-eol-cta)', color: 'var(--color-eol-cta-ink)' }
      : variant === 'ghost-on-dark'
        ? { background: 'transparent', color: 'var(--color-eol-heading-on-dark)', border: '1px solid rgba(255,255,255,0.22)' }
        : { background: 'transparent', color: 'var(--color-eol-text-secondary)', border: '1px solid var(--color-eol-border-strong)' }

  return (
    <button className={`${base} ${className}`} style={style} disabled={disabled || loading} {...rest}>
      {loading ? 'Working…' : children}
    </button>
  )
}
