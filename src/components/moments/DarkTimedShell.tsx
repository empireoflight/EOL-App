import type { ReactNode } from 'react'

// Breathing, A silent minute, Guided meditation, Binaural beats, Dance
// moment — anything you watch/listen to rather than read. `fixed inset-0`
// takes over the whole viewport (ignoring TeamLayout's sidebar) since this
// is meant to feel like leaving the app for a moment, not another page in it.
export function DarkTimedShell({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#000' }}>
      <div className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="text-[11.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'rgba(253,250,244,.6)' }}>
          {title}
        </div>
        <button type="button" onClick={onClose} className="text-[14px]" style={{ color: 'rgba(253,250,244,.72)' }}>
          Close
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">{children}</div>
      <div className="flex flex-wrap items-center justify-center gap-3 px-6 py-6 sm:px-10">{footer}</div>
    </div>
  )
}
