import type { ReactNode } from 'react'

// The dark hero band every team-scoped page starts with — sits flush under
// AppShell's own dark utility bar (same --gradient-header-glow background,
// no border between them) so the two read as one continuous dark region,
// then a 3px dawn stripe hands off into the page's light content area.
export function PageHeader({
  eyebrow,
  title,
  subline,
  actions,
  children,
}: {
  eyebrow?: string
  title: ReactNode
  subline?: string
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="print:hidden">
      <div className="px-10 pb-[34px] pt-[30px]" style={{ background: 'var(--gradient-header-glow)' }}>
        <div className="flex items-end justify-between gap-6">
          <div className="max-w-[760px]">
            {eyebrow && (
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--color-eol-gold-on-dark)' }}>
                {eyebrow}
              </div>
            )}
            <h1
              className="m-0 text-[36px] font-semibold leading-[1.22]"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-heading-on-dark)' }}
            >
              {title}
            </h1>
            {subline && (
              <p className="m-0 mt-2 max-w-[620px] text-[14px]" style={{ color: 'var(--color-eol-on-dark-muted)' }}>
                {subline}
              </p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
      <div style={{ height: 3, background: 'var(--gradient-dawn)' }} />
    </div>
  )
}
