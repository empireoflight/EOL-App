-- Bug fix + privacy leak found while diagnosing "invite never arrived":
-- convergence_sessions and session_participants both gated friction reads
-- on "is a team member" instead of "is a participant in this session" — so
-- a friction session raised with specific people ("Talk about it") was
-- actually readable by the whole team the moment it was created (its topic
-- visible in the Friction hub's session list to everyone, not just who was
-- selected). Vision intentionally stays team-wide readable (unaffected
-- here); only friction's scope was wrong.
--
-- friction_session_responses (the actual authored Q8-10 reveal) already
-- got this exact fix earlier, in 20260810150000_friction_reveal_scope_fix.sql
-- — its policy already checks session_participants, not team membership.
-- Nothing to change there; this migration only closes the same gap one
-- layer up, on the session and its participant list.

-- security definer so "am I a participant of this friction session" can be
-- checked from inside session_participants' own select policy without the
-- policy querying the table it's defined on directly — that self-reference
-- causes "infinite recursion detected in policy" (Postgres re-evaluates the
-- same policy for the subquery's own scan of the table). Same reason
-- is_team_member()/all_participants_submitted() are security definer.
create or replace function public.is_friction_session_participant(p_session_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.session_participants
    where session_id = p_session_id and user_id = auth.uid()
  );
$$ language sql security definer stable;

drop policy "Team members read team sessions" on public.convergence_sessions;

create policy "Team members read team vision sessions" on public.convergence_sessions
  for select using (session_type = 'vision' and public.is_team_member(team_id));

-- `initiator_id = auth.uid()` isn't redundant with the participant check:
-- the initiator is always added as a participant, but not until the next
-- statement after this session row is created — and that insert's own RLS
-- check (session_participants' "Facilitators and initiators add
-- participants" policy) needs to read this very row first. Without this
-- clause, that read fails RLS before the participant row ever gets
-- created — a bootstrap deadlock, caught by hand-testing this migration
-- with impersonated users rather than trusting it from the policy text.
create policy "Participants read their friction sessions" on public.convergence_sessions
  for select using (
    session_type = 'friction' and (initiator_id = auth.uid() or public.is_friction_session_participant(id))
  );

drop policy "Team members read session participants" on public.session_participants;

create policy "Team members read vision session participants" on public.session_participants
  for select using (
    exists (
      select 1 from public.convergence_sessions s
      where s.id = session_id and s.session_type = 'vision' and public.is_team_member(s.team_id)
    )
  );

create policy "Participants read their friction session participants" on public.session_participants
  for select using (
    exists (
      select 1 from public.convergence_sessions s
      where s.id = session_participants.session_id and s.session_type = 'friction'
    )
    and public.is_friction_session_participant(session_participants.session_id)
  );
