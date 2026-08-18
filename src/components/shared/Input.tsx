import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string }

export function Input({ label, className = '', id, ...rest }: InputProps) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      {label && (
        <span className="text-[11px] font-medium" style={{ color: 'var(--color-eol-text-muted)' }}>
          {label}
        </span>
      )}
      <input
        id={id}
        className={`rounded-lg border px-3 py-2.5 text-[13px] outline-none ${className}`}
        style={{ borderColor: 'var(--color-eol-border-strong)', background: 'var(--color-eol-surface-light)', color: 'var(--color-eol-text)' }}
        {...rest}
      />
    </label>
  )
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string }

export function Textarea({ label, hint, className = '', id, ...rest }: TextareaProps) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      {label && (
        <span className="text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
          {label}
        </span>
      )}
      <textarea
        id={id}
        className={`rounded-xl border px-3.5 py-3 text-[13px] leading-relaxed outline-none ${className}`}
        style={{ borderColor: 'var(--color-eol-border-strong)', background: 'var(--color-eol-surface-light)', color: 'var(--color-eol-text)', minHeight: 90 }}
        {...rest}
      />
      {hint && (
        <span className="text-[11px]" style={{ color: 'var(--color-eol-text-faint)' }}>
          {hint}
        </span>
      )}
    </label>
  )
}
