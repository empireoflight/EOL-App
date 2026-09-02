-- Lets an initiator cancel a friction session they started before anyone
-- else has been notified — invite emails now only go out once the topic is
-- written (send-friction-invite-email's call site moved to
-- FrictionRespondPage's submit), so "topic is still null" is exactly the
-- window where nobody else has any idea this session exists yet. Once the
-- topic is set, cancellation is no longer offered — dropping a session
-- other people have actually been invited into needs a different, visible
-- path, not a quiet delete.
create policy "Initiators can cancel a friction session before it's shared" on public.convergence_sessions
  for delete using (
    session_type = 'friction'
    and initiator_id = auth.uid()
    and (framing ->> 'topic') is null
  );
