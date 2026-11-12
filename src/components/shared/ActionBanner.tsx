import type { ReactNode } from 'react'

// A quiet "this needs you" strip for the top of a page: same surface, border,
// and type as Card, with one thin accent edge to mark it as something to act
// on (put links in it in --color-eol-accent-label, like the history rows). Used for the Unlearn page's waiting-on-you and discussion-guide banners.
export function ActionBanner({
  eyebrow,
  title,
  detail,
  actions,
}: {
  eyebrow: string
  title: ReactNode
  detail?: ReactNode
  actions: ReactNode
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-[16px] border px-5 py-4"
      style={{
        background: 'var(--color-eol-surface)',
        borderColor: 'var(--color-eol-border)',
        boxShadow: 'inset 3px 0 0 var(--color-eol-accent)',
      }}
    >
      <div className="min-w-0 flex-1 basis-64">
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
