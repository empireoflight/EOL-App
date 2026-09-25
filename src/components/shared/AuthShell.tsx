import type { ReactNode } from 'react'
import { Logo } from './Logo'

// Shared shell for the four auth screens (login, signup, forgot/reset
// password) — dark auth-glow background, 3px dawn stripe at the very top
// (matching AppShell's stripe under its own dark header), centered logo +
// title, then whatever card/content each page needs below.
export function AuthShell({
  title,
  titleSize = 28,
  subline,
  children,
}: {
  title: string
  titleSize?: number
  subline?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--gradient-auth-glow)' }}>
      <div style={{ height: 3, background: 'var(--gradient-dawn)' }} />
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <Logo size={36} />
            <h1
              className="m-0 font-semibold"
              style={{ fontSize: titleSize, fontFamily: 'var(--font-display)', color: 'var(--color-eol-heading-on-dark)' }}
            >
              {title}
            </h1>
            {subline && (
              <p className="m-0 text-[13px]" style={{ color: 'var(--color-eol-on-dark-muted)' }}>
                {subline}
              </p>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
