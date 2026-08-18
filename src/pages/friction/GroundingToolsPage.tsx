const TOOLS = [
  { title: 'Guided meditation', duration: '8 min', hue: 78 },
  { title: 'Breathing', duration: '2 min', hue: 350 },
  { title: 'Dance moment', duration: '3 min', hue: 315 },
  { title: 'Forest Bathing Lite', duration: '6 min', hue: 55 },
  { title: 'Binaural beats', duration: 'Anytime', hue: 78 },
  { title: 'Shake it off moment', duration: '1 min', hue: 350 },
  { title: 'Free form art', duration: 'Anytime', hue: 315 },
  { title: 'Team activity suggestions', duration: 'Anytime', hue: 55 },
  { title: 'Go for a walk with no plan', duration: 'Anytime', hue: 78 },
]

export default function GroundingToolsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10">
      <div>
        <div className="mb-1 text-[11px]" style={{ color: 'var(--color-eol-text-muted)' }}>
          Unlearn
        </div>
        <h1 className="m-0 text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          Create space
        </h1>
        <p className="m-0 mt-1 text-[13px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
          Pick whatever fits the moment. No tracking, no streaks.
        </p>
      </div>

      <div className="relative">
        <div className="grid grid-cols-2 gap-3 opacity-40 sm:grid-cols-3">
          {TOOLS.map((tool) => (
            <div
              key={tool.title}
              className="flex flex-col gap-2.5 rounded-2xl border p-4"
              style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border)' }}
            >
              <div className="h-7 w-7 rounded-full" style={{ background: `oklch(0.90 0.045 ${tool.hue})` }} />
              <div className="text-[13px] font-semibold leading-snug" style={{ color: 'var(--color-eol-text)' }}>
                {tool.title}
              </div>
              <div className="text-[11px]" style={{ color: 'var(--color-eol-text-faint)' }}>
                {tool.duration}
              </div>
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span
            className="-rotate-12 whitespace-nowrap rounded-lg border-2 px-6 py-2 text-[22px] font-bold uppercase tracking-wide"
            style={{ borderColor: 'var(--color-eol-accent)', color: 'var(--color-eol-accent-label)', background: 'var(--color-eol-bg)' }}
          >
            Coming soon
          </span>
        </div>
      </div>
    </div>
  )
}
