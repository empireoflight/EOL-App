import type { CSSProperties } from 'react'
import { track } from '@vercel/analytics'

export const DISPLAY: CSSProperties = { fontFamily: "'Josefin Sans', sans-serif" }

export const HEADER_GRADIENT = 'linear-gradient(90deg,#FFF6AD 0%,#FFD0D3 50%,#FFA9F8 100%)'

export const BOOKING_URL = 'https://calendar.app.google/2jPMzZfFstQKM49p7'
export const SUBSTACK_URL = 'https://substack.com/@empireoflight'
export const CONTACT_EMAIL = 'kelly@empireoflightcollective.com'

/** Fires a Vercel Analytics custom event before following the link — `location` identifies which CTA instance was clicked. */
export function trackBooking(location: string) {
  track('book_a_conversation_click', { location })
}

export function trackSubstack(location: string) {
  track('substack_follow_click', { location })
}

export const navLink = 'text-[14px]'
export const navLinkStyle: CSSProperties = { color: 'rgba(19,17,20,.68)', borderBottom: 'none' }

// Matches Button.tsx's shape/colors (rounded-lg, --color-eol-accent/--color-eol-ink)
// so every CTA on the marketing site reads as the same button as the rest of the app.
export const primaryButton = (extra?: CSSProperties): CSSProperties => ({
  ...DISPLAY,
  color: 'var(--color-eol-ink)',
  background: 'var(--color-eol-accent)',
  ...extra,
})

export const secondaryButtonOnDark: CSSProperties = {
  ...DISPLAY,
  color: '#FBF7F2',
  border: '1px solid rgba(251,247,242,.32)',
}

export function OctopusIcon({ size = 40, color = '#D99A22' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" aria-hidden="true">
      <path d="M12.5 18.5a7.5 7.5 0 0 1 15 0v2.5h-15z" />
      <path d="M13.4 21c-2.6 2.9-4.8 4-8.4 4.2" />
      <path d="M14.8 21.6c-1.8 3.8-3.4 5.8-6.6 7.9" />
      <path d="M16.8 22c-.9 4-1 6.7-2.7 10" />
      <path d="M19 22.2c.1 4.2.6 7-.2 11" />
      <path d="M21 22.2c-.1 4.2.4 7 1.5 10.8" />
      <path d="M23.2 22c.9 4 2 6.3 4.1 9.3" />
      <path d="M25.2 21.6c1.8 3.8 3.6 5.2 6.6 7.1" />
      <path d="M26.6 21c2.6 2.9 4.8 4 8.4 4.2" />
      <circle cx="17.2" cy="16.4" r=".9" fill={color} stroke="none" />
      <circle cx="22.8" cy="16.4" r=".9" fill={color} stroke="none" />
    </svg>
  )
}

export function BrainIcon({ size = 40, color = '#D99A22' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15.5 9.5c-2.6 0-4.7 1.9-5 4.4-2 .8-3.4 2.8-3.4 5.1 0 1.4.5 2.7 1.4 3.7-.3.7-.5 1.5-.5 2.3 0 3 2.3 5.4 5.2 5.6.6 1.6 2.2 2.9 4 2.9 2.4 0 4.3-1.9 4.3-4.3V13.8c0-2.4-2.4-4.3-6-4.3z" />
      <path d="M24.5 9.5c2.6 0 4.7 1.9 5 4.4 2 .8 3.4 2.8 3.4 5.1 0 1.4-.5 2.7-1.4 3.7.3.7.5 1.5.5 2.3 0 3-2.3 5.4-5.2 5.6-.6 1.6-2.2 2.9-4 2.9-2.4 0-4.3-1.9-4.3-4.3V13.8c0-2.4 2.4-4.3 6-4.3z" />
      <path d="M17.5 15.5c1 .6 1.6 1.6 1.6 2.8M13.5 19.5c1.2 0 2.2.6 2.8 1.6M14 25.5c1.3-.3 2.5.1 3.3 1M22.5 15.5c-1 .6-1.6 1.6-1.6 2.8M26.5 19.5c-1.2 0-2.2.6-2.8 1.6M26 25.5c-1.3-.3-2.5.1-3.3 1" />
    </svg>
  )
}

export function LandscapeIcon({ size = 40, color = '#D99A22' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="28.5" cy="11.5" r="3.2" />
      <path d="M4 29.5l8.5-11.5 6 7 3-4 9 8.5" />
      <path d="M4 29.5h32" />
    </svg>
  )
}

/** Section eyebrow label — the small uppercase kicker above section headings. */
export function Eyebrow({ children, color = '#A96D0F' }: { children: React.ReactNode; color?: string }) {
  return (
    <div className="mb-5 text-[13px] font-semibold uppercase tracking-[0.16em]" style={{ ...DISPLAY, color }}>
      {children}
    </div>
  )
}
