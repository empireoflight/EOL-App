type ReadinessBannerProps = {
  submittedCount: number
  totalParticipants: number
  gateMet: boolean
  isFacilitator: boolean
  onGenerate: () => void
  generating?: boolean
  /** True once a guide already exists and this would re-run synthesis on new input. */
  regenerate?: boolean
  /**
   * Lets the facilitator generate before the gate trips — i.e. without
   * everyone having submitted yet. Off by default: friction's simultaneous-
   * reveal gate (spec §16) must never be forced open early, so only vision
   * call sites opt in. Synthesis itself already tolerates partial input
   * (process-synthesis-job requires at least one reflection, not all of
   * them) — this only changes when the button becomes visible.
   */
  allowBeforeGateMet?: boolean
}

/**
 * "4 of 6 submitted" progress, and once the gate trips (or immediately, if
 * allowBeforeGateMet), a facilitator-only nudge to generate the guide —
 * never auto-advances (spec §16).
 */
export function ReadinessBanner({
  submittedCount,
  totalParticipants,
  gateMet,
  isFacilitator,
  onGenerate,
  generating,
  regenerate,
  allowBeforeGateMet,
}: ReadinessBannerProps) {
  const canGenerateNow = gateMet || allowBeforeGateMet
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-2xl border px-5 py-4"
      style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border)' }}
    >
      <div className="text-sm" style={{ color: 'var(--color-eol-text-secondary)' }}>
        {submittedCount} of {totalParticipants} submitted
      </div>
      {canGenerateNow && isFacilitator && (
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="shrink-0 rounded-lg px-4 py-2 text-[13px] font-semibold disabled:opacity-60"
          style={{ background: 'var(--color-eol-accent)', color: 'var(--color-eol-ink)' }}
        >
          {generating
            ? regenerate
              ? 'Regenerating…'
              : 'Generating…'
            : regenerate
              ? 'Regenerate discussion guide'
              : !gateMet
                ? 'Generate now anyway'
                : 'Generate discussion guide'}
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
