export type PrivacyTier = 0 | 1 | 2 | 3 | 4

type TierInfo = {
  label: string
  bg: string
  fg: string
  dot: string
}

const TIER_INFO: Record<PrivacyTier, TierInfo> = {
  0: { label: 'Ephemeral, never stored', bg: 'var(--color-tier0-bg)', fg: 'var(--color-tier0-fg)', dot: 'var(--color-tier0-dot)' },
  1: { label: 'Private, sealed', bg: 'var(--color-tier1-bg)', fg: 'var(--color-tier1-fg)', dot: 'var(--color-tier1-dot)' },
  2: { label: 'AI-assisted', bg: 'var(--color-tier2-bg)', fg: 'var(--color-tier2-fg)', dot: 'var(--color-tier2-dot)' },
  3: { label: 'Team aggregate', bg: 'var(--color-tier3-bg)', fg: 'var(--color-tier3-fg)', dot: 'var(--color-tier3-dot)' },
  4: { label: 'Team shared', bg: 'var(--color-tier4-bg)', fg: 'var(--color-tier4-fg)', dot: 'var(--color-tier4-dot)' },
}

type TierBadgeProps = {
  tier: PrivacyTier
}

/** Small pill showing which privacy tier (§1 of the spec) a piece of content is in. */
export function TierBadge({ tier }: TierBadgeProps) {
  const info = TIER_INFO[tier]
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-2 pr-2.5 text-[11px] font-semibold tracking-wide"
      style={{ background: info.bg, color: info.fg, fontFamily: 'var(--font-body)' }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: info.dot }} />
      Tier {tier} &middot; {info.label}
    </span>
  )
}
