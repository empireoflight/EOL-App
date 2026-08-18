-- Deliberate, narrow privacy-model change: vision reflections become
-- readable by the whole team, not just their author. This is NOT a
-- relaxation of the "no role-based policy, ever" hard rule stated on
-- private_reflections and its sibling tables (pulse_energy_selections,
-- pulse_energy_notes, checkin_mood_scores) — that rule is about privileged
-- roles (org-admin/facilitator) reading someone else's private data. This
-- policy is peer-scoped (any team member, not a role) and kind-scoped
-- (only 'vision_answer' — every other kind, e.g. pulse_elaboration,
-- friction_context, stays owner-only via the existing select policy).
-- The product reasoning: vision is a co-creation exercise where the raw
-- nuance in someone's own words is the point, unlike friction (where
-- privacy is what makes honest answers possible in the first place) or
-- pulse (where individual answers are never meant to be attributed).
create policy "Team members read each other's vision answers" on public.private_reflections
  for select using (
    kind = 'vision_answer' and team_id is not null and public.is_team_member(team_id)
  );
