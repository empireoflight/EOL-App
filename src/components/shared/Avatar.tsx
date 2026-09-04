// Deterministic per-person color, matching the mockup's palette of avatar hues.
const PALETTE = [
  'oklch(0.75 0.12 78)',
  'oklch(0.75 0.11 350)',
  'oklch(0.72 0.10 315)',
  'oklch(0.72 0.11 55)',
  'oklch(0.68 0.10 195)',
  'oklch(0.70 0.10 150)',
]

function colorFor(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

type AvatarProps = {
  name: string
  size?: number
  avatarUrl?: string | null
}

export function Avatar({ name, size = 32, avatarUrl }: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }

  const initial = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: colorFor(name),
        color: 'var(--color-eol-ink)',
      }}
    >
      {initial}
    </div>
  )
}
