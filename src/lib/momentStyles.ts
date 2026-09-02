import type { CSSProperties } from 'react'

// Split out of DarkTimedShell.tsx — a component file can only export
// components (react-refresh/only-export-components), so this plain helper
// needs its own home.
export function darkPillButton(kind: 'ghost' | 'solid' = 'ghost'): CSSProperties {
  return kind === 'solid'
    ? { padding: '11px 22px', borderRadius: 999, background: 'var(--color-eol-accent)', color: 'var(--color-eol-ink)', fontWeight: 700, fontSize: 14.5, cursor: 'pointer' }
    : {
        padding: '11px 22px',
        borderRadius: 999,
        border: '1px solid rgba(253,250,244,.28)',
        color: 'rgba(253,250,244,.92)',
        fontWeight: 600,
        fontSize: 14.5,
        cursor: 'pointer',
      }
}
