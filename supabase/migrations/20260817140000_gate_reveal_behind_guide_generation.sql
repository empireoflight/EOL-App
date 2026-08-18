-- Both friction and vision previously revealed peer answers as soon as
-- everyone had submitted, independent of whether a guide had actually been
-- generated yet — so submitting your own response could immediately surface
-- everyone else's raw answers, before any synthesis existed. The intended
-- design is a single reveal moment: once the guide is ready, not once
-- submission is merely complete. (This also supersedes the vision-answers
-- migration's original "team members read each other's vision answers as
-- soon as submitted" reasoning — same simultaneous-reveal principle now
-- applies to both flows.)

drop policy if exists "Session participants read all friction responses once everyone has submitted" on public.friction_session_responses;

create policy "Session participants read all friction responses once the guide is ready" on public.friction_session_responses
  for select using (
    exists (
      select 1 from public.session_participants sp
      where sp.session_id = friction_session_responses.session_id and sp.user_id = auth.uid()
    )
    and exists (
      select 1 from public.convergence_sessions s
      where s.id = friction_session_responses.session_id and s.discussion_guide is not null
    )
  );

drop policy if exists "Team members read each other's vision answers" on public.private_reflections;

create policy "Team members read each other's vision answers once the guide is ready" on public.private_reflections
  for select using (
    kind = 'vision_answer' and team_id is not null and public.is_team_member(team_id)
    and exists (
      select 1 from public.visions v
      where v.session_id = private_reflections.session_id and v.alignment_guide is not null
    )
  );
