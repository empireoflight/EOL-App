import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

// The one banner treatment: a "this is here for you" strip at the top of a
// page. Same surface, border, and type as Card, with a small eyebrow, a
// display-font title, an optional detail line, and the action(s) on the
// right. Don't style a banner any other way; pass what's different (eyebrow,
// leading faces, actions) instead.
export function ActionBanner({
  eyebrow,
  title,
  detail,
  leading,
  actions,
}: {
  eyebrow: string
  title: ReactNode
  detail?: ReactNode
  /** Optional element before the text, e.g. a row of avatars. */
  leading?: ReactNode
  actions: ReactNode
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[16px] border px-5 py-4"
      style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border)' }}
    >
      {leading}
      <div className="min-w-0 flex-1 basis-56">
        <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-accent-label)' }}>
          {eyebrow}
        </div>
        <div className="mt-0.5 text-[15px] font-semibold leading-snug" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          {title}
        </div>
        {detail && (
          <div className="mt-0.5 text-[12.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
            {detail}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>
    </div>
  )
}

// The text-link action for an ActionBanner.
export function BannerLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-[13.5px] font-semibold transition-opacity hover:opacity-70" style={{ color: 'var(--color-eol-accent-label)' }}>
      {children}
    </Link>
  )
}
