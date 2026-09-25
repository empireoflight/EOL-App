export type PrivacyTier = 0 | 1 | 2 | 3 | 4

type TierInfo = {
  label: string
  bg: string
  fg: string
  dot: string
  border: string
}

const TIER_INFO: Record<PrivacyTier, TierInfo> = {
  0: { label: 'Ephemeral, never stored', bg: 'var(--color-tier0-bg)', fg: 'var(--color-tier0-fg)', dot: 'var(--color-tier0-dot)', border: 'var(--color-tier0-border)' },
  1: { label: 'Private, sealed', bg: 'var(--color-tier1-bg)', fg: 'var(--color-tier1-fg)', dot: 'var(--color-tier1-dot)', border: 'var(--color-tier1-border)' },
  2: { label: 'AI-assisted', bg: 'var(--color-tier2-bg)', fg: 'var(--color-tier2-fg)', dot: 'var(--color-tier2-dot)', border: 'var(--color-tier2-border)' },
  3: { label: 'Team aggregate', bg: 'var(--color-tier3-bg)', fg: 'var(--color-tier3-fg)', dot: 'var(--color-tier3-dot)', border: 'var(--color-tier3-border)' },
  4: { label: 'Team shared', bg: 'var(--color-tier4-bg)', fg: 'var(--color-tier4-fg)', dot: 'var(--color-tier4-dot)', border: 'var(--color-tier4-border)' },
}

type TierBadgeProps = {
  tier: PrivacyTier
}

/** Small tag showing which privacy tier (§1 of the spec) a piece of content is in. */
export function TierBadge({ tier }: TierBadgeProps) {
  const info = TIER_INFO[tier]
  return (
    <span
      className="inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-[6px] border px-2 text-[11px] font-medium"
      style={{ background: info.bg, color: info.fg, borderColor: info.border, fontFamily: 'var(--font-body)' }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-[2px]" style={{ background: info.dot }} />
      <span style={{ opacity: 0.7, fontSize: 10 }}>T{tier}</span>
      {info.label}
    </span>
  )
}
