type ReadinessBannerProps = {
  submittedCount: number
  totalParticipants: number
  gateMet: boolean
  isFacilitator: boolean
  onGenerate: () => void
  generating?: boolean
  /** True once a guide already exists and this would re-run synthesis on new input. */
  regenerate?: boolean
}

/**
 * "4 of 6 submitted" progress, and once the gate trips, a facilitator-only
 * nudge to generate the guide — never auto-advances (spec §16).
 */
export function ReadinessBanner({
  submittedCount,
  totalParticipants,
  gateMet,
  isFacilitator,
  onGenerate,
  generating,
  regenerate,
}: ReadinessBannerProps) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-2xl border px-5 py-4"
      style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border)' }}
    >
      <div className="text-sm" style={{ color: 'var(--color-eol-text-secondary)' }}>
        {submittedCount} of {totalParticipants} submitted
      </div>
      {gateMet && isFacilitator && (
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="shrink-0 rounded-lg px-4 py-2 text-[13px] font-semibold disabled:opacity-60"
          style={{ background: 'var(--color-eol-accent)', color: 'var(--color-eol-ink)' }}
        >
          {generating ? (regenerate ? 'Regenerating…' : 'Generating…') : regenerate ? 'Regenerate discussion guide' : 'Generate discussion guide'}
        </button>
      )}
      {gateMet && !isFacilitator && (
        <div className="text-[13px]" style={{ color: 'var(--color-eol-text-faint)' }}>
          Waiting on the facilitator to generate the guide
        </div>
      )}
    </div>
  )
}
