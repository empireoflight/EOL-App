-- Friction synthesis was deliberately deferred at launch ("not required for
-- v1"). The user now wants it: once everyone's tier-4 authored answers are
-- revealed, generate a discussion guide for the meeting they're about to
-- have. No new RLS needed — this column is exposed through the same
-- participant-scoped friction select policy as the rest of the row
-- (20260814160000_scope_friction_to_participants.sql), same way
-- visions.layout/alignment_guide inherit visions' own policy.
alter table public.convergence_sessions add column discussion_guide jsonb;
