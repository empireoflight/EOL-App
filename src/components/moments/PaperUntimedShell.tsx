import type { ReactNode } from 'react'
import { Button } from '../shared/Button'

// Forest bathing lite, A walk with no goal, Free-form art — content you read
// then go do somewhere else. No timer, no forced pacing; `children` is the
// moment-specific body content, `ctaLabel` is the only action ("I'm back" /
// "Done").
export function PaperUntimedShell({
  eyebrow,
  title,
  children,
  ctaLabel,
  onDone,
}: {
  eyebrow: string
  title: string
  children: ReactNode
  ctaLabel: string
  onDone: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(19,17,20,.6)' }}>
      <div
        className="flex w-full max-w-[420px] flex-col gap-5 rounded-[20px] p-7"
        style={{ background: 'var(--color-eol-surface-light)', boxShadow: '0 24px 56px rgba(38,34,42,.24)' }}
      >
        <div className="flex flex-col gap-1.5">
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-eol-accent-label)' }}>
            {eyebrow}
          </div>
          <div className="text-[27px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            {title}
          </div>
        </div>
        {children}
        <Button onClick={onDone}>{ctaLabel}</Button>
      </div>
    </div>
  )
}
