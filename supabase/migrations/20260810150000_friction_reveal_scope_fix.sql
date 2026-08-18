-- Fixes a real scoping bug in the previous migration: the reveal policy
-- checked "is this person a team member," not "is this person actually in
-- this friction session." That would let any team member read a two-person
-- friction conversation's authored answers once revealed — spec §16 never
-- says friction content broadcasts to the whole team, only that it reveals
-- to the session's own participants once everyone submits. Caught while
-- writing the pgTAP tests for this exact table, before any real use.
drop policy if exists "Team members read all friction responses once everyone has submitted" on public.friction_session_responses;

create policy "Session participants read all friction responses once everyone has submitted" on public.friction_session_responses
  for select using (
    exists (
      select 1 from public.session_participants sp
      where sp.session_id = friction_session_responses.session_id and sp.user_id = auth.uid()
    )
    and public.all_participants_submitted(session_id)
  );
