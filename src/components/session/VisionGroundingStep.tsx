import { MEDITATION_STEPS } from '../../lib/meditation'
import { Button } from '../shared/Button'

// A short grounding moment before the vision questionnaire, in the same
// night-sky look as the Friction Mitigator's "ground first" screen. The
// facilitator supplies only the prompt; the guidance around it is fixed.
export function VisionGroundingStep({ prompt, onReady }: { prompt: string; onReady: () => void }) {
  return (
    <div className="min-h-full px-6 py-10" style={{ background: 'var(--color-eol-night)' }} role="region" aria-label="A moment to settle before you begin">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 text-center">
        <div>
          <div className="mb-1 text-[11px]" style={{ color: 'var(--color-eol-on-dark-faint)' }}>
            Reimagine · Before you begin
          </div>
          <h1 className="m-0 text-[26px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-heading-on-dark)' }}>
            Take a moment to arrive
          </h1>
        </div>

        <div className="flex h-[190px] w-[190px] items-center justify-center rounded-full" style={{ border: '1px solid rgba(255,255,255,0.14)' }}>
          <div
            className="eol-breathe h-32 w-32 rounded-full"
            style={{ background: 'radial-gradient(circle, #fff0c0, #ffb3e6)', boxShadow: '0 0 70px rgba(255,169,248,0.4)' }}
          />
        </div>

        <p className="m-0 max-w-sm text-[13.5px] leading-relaxed" style={{ color: 'var(--color-eol-on-dark-muted)' }}>
          Before you start, give yourself a minute to settle. Breathe in as the circle grows, out as it settles. Your answers come more easily from a calm place.
        </p>

        <ol className="m-0 flex w-full list-none flex-col gap-3 rounded-2xl p-5 text-left" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {MEDITATION_STEPS.map((step) => (
            <li key={step} className="flex items-start gap-3 text-[14px] leading-snug" style={{ color: 'var(--color-eol-heading-on-dark)' }}>
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--gradient-dawn)' }} />
              {step}
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--color-eol-gold-on-dark)' }}>
            Then
          </div>
          <p className="m-0 text-[22px] leading-[1.4]" style={{ fontFamily: 'var(--font-display)', fontWeight: 400, color: 'var(--color-eol-heading-on-dark)' }}>
            {prompt}
          </p>
        </div>

        <div className="mt-2 flex w-full flex-col gap-2.5">
          <Button onClick={onReady} className="w-full">
            I'm ready
          </Button>
          <button type="button" onClick={onReady} className="text-center text-[12.5px]" style={{ color: 'var(--color-eol-on-dark-muted)' }}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
