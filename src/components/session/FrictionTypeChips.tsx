import { FRICTION_TYPES } from '../../lib/frictionQuestions'

// "What kind of friction is this?" Selecting the active chip again clears it.
// Shared by the group flow (FrictionRespondPage) and the personal guide flow
// (FrictionPreparePage).
export function FrictionTypeChips({ value, onChange }: { value: string | null; onChange: (next: string | null) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
        What kind of friction is this?
      </span>
      <div className="flex flex-wrap gap-2">
        {FRICTION_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(value === t ? null : t)}
            className="rounded-full px-3.5 py-1.5 text-[12px] font-medium"
            style={
              value === t
                ? { background: 'var(--color-eol-night)', color: 'var(--color-eol-heading-on-dark)' }
                : { border: '1px solid var(--color-eol-border-strong)', color: 'var(--color-eol-text-secondary)' }
            }
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}
