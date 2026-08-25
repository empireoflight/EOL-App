// Shared between experiments and actions — both use the same lifecycle,
// so this stays in one place rather than duplicated across
// ExperimentsPage.tsx, ActionsPanel.tsx, and PulseCheckPage.tsx.
export type TaskStatus = 'not_started' | 'in_progress' | 'done' | 'dropped'

export const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  done: 'Done',
  dropped: 'Dropped',
}
