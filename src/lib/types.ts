// Shared row shapes mirroring the Phase 0/1 schema. Kept hand-written rather
// than generated for now — small enough surface area that generation isn't
// pulling its weight yet.
import type { SessionStatus } from './sessionStateMachine'

export type Organization = {
  id: string
  name: string
  created_at: string
}

export type Team = {
  id: string
  org_id: string
  name: string
  created_at: string
}

export type TeamMember = {
  team_id: string
  user_id: string
  team_role: 'facilitator' | 'member'
  joined_at: string
  users?: { id: string; name: string; email: string }
}

export type TeamInvite = {
  id: string
  team_id: string
  email: string
  invited_by: string
  token: string
  status: 'pending' | 'accepted' | 'revoked'
  created_at: string
  accepted_at: string | null
}

export type TeamInviteLink = {
  id: string
  team_id: string
  token: string
  created_by: string
  status: 'active' | 'revoked'
  created_at: string
}

export type ConvergenceSession = {
  id: string
  team_id: string
  session_type: 'vision' | 'friction'
  status: SessionStatus
  initiator_id: string
  framing: Record<string, unknown>
  readiness_gate: { type: 'all' } | { type: 'quorum'; threshold: number } | { type: 'deadline'; deadline: string }
  meeting_at: string | null
  discussion_guide: { summary: string; talkingPoints: string[] } | null
  created_at: string
  updated_at: string
}

export type SessionParticipant = {
  session_id: string
  user_id: string
  submitted_at: string | null
}

export type SynthesisJob = {
  id: string
  session_id: string
  status: 'queued' | 'running' | 'succeeded' | 'failed'
  attempts: number
  error: string | null
  created_at: string
  completed_at: string | null
}

export type VisionNode = {
  id: string
  kind: 'north_star' | 'pillar' | 'practice' | 'signal'
  text: string
  x: number
  y: number
}

export type VisionEdge = {
  from: string
  to: string
}

export type VisionLayout = {
  nodes: VisionNode[]
  edges: VisionEdge[]
}

export type VisionAlignmentGuide = {
  alignment: string
  disconnect: string
}

export type Vision = {
  id: string
  team_id: string
  session_id: string | null
  layout: VisionLayout
  alignment_guide: VisionAlignmentGuide | null
  status: 'draft' | 'pending_commitment' | 'committed'
  created_by: string
  created_at: string
  committed_at: string | null
}

export type VisionCommitment = {
  vision_id: string
  user_id: string
  status: 'committed' | 'waiting'
  note: string | null
  committed_at: string | null
}

export type Experiment = {
  id: string
  team_id: string
  vision_id: string | null
  pillar_node_id: string | null
  title: string
  hypothesis: string | null
  learning: string | null
  assignee_id: string | null
  status: 'not_started' | 'in_progress' | 'done' | 'dropped'
  due_date: string | null
  cycle_start: string | null
  cycle_end: string | null
  completed_at: string | null
  reminder_sent_at: string | null
  created_by: string
  created_at: string
}

// A lighter to-do alongside experiments — no pillar link, no
// hypothesis/learning writeup. Same status lifecycle and completed_at
// semantics, so it participates in the same weekly-review and
// tasks-completed logic as an experiment.
export type Action = {
  id: string
  team_id: string
  vision_id: string | null
  title: string
  assignee_id: string | null
  status: 'not_started' | 'in_progress' | 'done' | 'dropped'
  due_date: string | null
  completed_at: string | null
  reminder_sent_at: string | null
  created_by: string
  created_at: string
}

export type TeamSignal = {
  id: string
  team_id: string
  source: string
  signal_type: string
  value: unknown
  contributor_count: number
  period_start: string | null
  period_end: string | null
  created_at: string
}

export type AppNotification = {
  id: string
  user_id: string
  team_id: string | null
  kind: string
  session_id: string | null
  message: string
  read_at: string | null
  created_at: string
}
