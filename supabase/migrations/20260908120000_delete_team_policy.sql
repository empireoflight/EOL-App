-- Lets a team's facilitator delete the team outright — no DELETE policy
-- existed on public.teams at all before this (only SELECT/INSERT/UPDATE),
-- so this was a service_role-only operation until now. Matches this app's
-- existing facilitator-gated permission shape (invites, guide regeneration,
-- vision revision are all facilitator-level, not org-admin-level) — teams
-- has no created_by/"team creator" concept, so facilitator is the only
-- meaningful existing boundary.
--
-- Every table with a direct team_id FK already cascades on delete
-- (team_members, convergence_sessions and everything chained off it,
-- visions, experiments, actions, pulse_vibe_scores, pulse_energy_notes,
-- team_signals, team_invites, team_invite_links,
-- friction_grounding_completions, notifications) except
-- private_reflections.team_id, which is `on delete set null` by design —
-- that tier-1 table is keyed by user_id and deliberately outlives a
-- deleted team. No cascade changes needed here, just the missing policy.
create policy "Facilitators delete their team" on public.teams
  for delete using (public.is_team_facilitator(id));
