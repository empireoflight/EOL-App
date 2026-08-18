-- Same gap 20260810130000 fixed for team_members: session_participants.user_id
-- references auth.users(id), which PostgREST can't see, so any
-- `.select('user_id, users(...))'` embed on this table fails with PGRST200
-- ("no relationship found") — caught live while testing
-- send-friction-invite-email, which was silently sending to zero
-- recipients because the failed query's error was discarded rather than
-- checked. Adding the same public.users(id) FK PostgREST needs to embed.
alter table public.session_participants
  add constraint session_participants_user_id_public_users_fkey
  foreign key (user_id) references public.users(id) on delete cascade;
