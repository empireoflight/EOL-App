import { Button } from '../shared/Button'

// Shake it off — numbered steps plus a short countdown, on a paper card
// over a dimmed backdrop (same full-viewport takeover feel as
// DarkTimedShell, just a light card instead of a black screen).
export function PaperTimedShell({
  eyebrow,
  title,
  timeLabel,
  steps,
  onDone,
  onSkip,
}: {
  eyebrow: string
  title: string
  timeLabel: string
  steps: string[]
  onDone: () => void
  onSkip: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(19,17,20,.6)' }}>
      <div
        className="flex w-full max-w-[420px] flex-col gap-4 rounded-[20px] p-7"
        style={{ background: 'var(--color-eol-surface-light)', boxShadow: '0 24px 56px rgba(38,34,42,.24)' }}
      >
        <div className="flex flex-col gap-1">
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-eol-accent-label)' }}>
            {eyebrow}
          </div>
          <div className="text-[27px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            {title}
          </div>
        </div>
        <div className="flex items-center justify-center py-2">
          <div className="text-[56px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            {timeLabel}
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div
                className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold"
                style={{ background: 'var(--color-eol-accent)', color: 'var(--color-eol-ink)', fontFamily: 'var(--font-display)' }}
              >
                {i + 1}
              </div>
              <div className="text-[14.5px] leading-snug" style={{ color: 'var(--color-eol-text-secondary)' }}>
                {step}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={onDone} className="flex-1">
            Done
          </Button>
          <Button variant="secondary" onClick={onSkip}>
            Skip
          </Button>
        </div>
      </div>
    </div>
  )
}
