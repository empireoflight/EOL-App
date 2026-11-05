export type PendingParticipantRow = {
  session_id: string
  convergence_sessions: { id: string; team_id: string; session_type: string; status: string; created_at: string } | null
}

// Where to send someone right after they sign in: straight to the vision
// questionnaire they still owe, if any. Only sessions still collecting
// reflections count — once the guide exists, a late submission isn't
// something to pull people into at login (the Overview banner still offers
// it). If several teams are waiting on them, the one that's been waiting
// longest goes first.
export function pickPendingVisionPath(rows: PendingParticipantRow[]): string | null {
  const waiting = rows
    .map((r) => r.convergence_sessions)
    .filter((s): s is NonNullable<PendingParticipantRow['convergence_sessions']> => !!s && s.session_type === 'vision' && s.status === 'collecting')
    .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0))
  const first = waiting[0]
  return first ? `/teams/${first.team_id}/vision/sessions/${first.id}/reflect` : null
}
