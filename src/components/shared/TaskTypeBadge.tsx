// Shared "Action" / "Experiment" pill — used on the Do page's table and the
// Evolve page's completed-items drill-down, so the two don't drift out of
// sync visually.
export function TaskTypeBadge({ type }: { type: 'action' | 'experiment' }) {
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[10.5px] font-medium"
      style={{ borderColor: 'var(--color-eol-border-strong)', color: 'var(--color-eol-text-muted)' }}
    >
      {type === 'action' ? 'Action' : 'Experiment'}
    </span>
  )
}
