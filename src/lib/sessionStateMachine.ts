// Convergence session state machine (spec §16). Both vision and friction
// sessions run on this — session_type is configuration, not different
// machinery. Shared between the client (gates which buttons render) and the
// process-synthesis-job Edge Function (rejects invalid transitions
// defensively, since the DB check constraint only validates the value is a
// known status, not that the transition into it was legal).

export type SessionStatus =
  | 'draft'
  | 'collecting'
  | 'ready'
  | 'synthesizing'
  | 'guide_ready'
  | 'scheduled'
  | 'discussed'
  | 'closed'

const ALLOWED_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  draft: ['collecting'],
  collecting: ['ready'],
  ready: ['synthesizing', 'collecting'], // facilitator can choose to wait for a straggler
  synthesizing: ['guide_ready', 'ready'], // failed synthesis falls back to ready for a retry
  // 'scheduled' is a placeholder for future calendar integration — nothing
  // currently produces it, so guide_ready also goes to 'discussed' directly
  // ("the call happened", no formal scheduling step yet).
  guide_ready: ['scheduled', 'discussed', 'synthesizing'], // regenerate once more reflections come in
  scheduled: ['discussed'],
  discussed: ['closed', 'collecting'], // reopen for a next cycle
  closed: [],
}

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

export function nextStatuses(from: SessionStatus): SessionStatus[] {
  return ALLOWED_TRANSITIONS[from] ?? []
}

export type ReadinessGate =
  | { type: 'all' }
  | { type: 'quorum'; threshold: number }
  | { type: 'deadline'; deadline: string }

export function isReadinessGateMet(
  gate: ReadinessGate,
  submittedCount: number,
  totalParticipants: number
): boolean {
  if (totalParticipants === 0) return false
  switch (gate.type) {
    case 'all':
      return submittedCount >= totalParticipants
    case 'quorum':
      return submittedCount / totalParticipants >= gate.threshold
    case 'deadline':
      return new Date() >= new Date(gate.deadline) && submittedCount > 0
  }
}
