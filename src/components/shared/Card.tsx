import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[16px] border p-5 ${className}`}
      style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border)' }}
    >
      {children}
    </div>
  )
}
