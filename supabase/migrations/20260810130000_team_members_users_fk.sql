-- PostgREST can only embed related rows (e.g. `select=*,users(name)`) through
-- a foreign key it can see in the exposed `public` schema. team_members.user_id
-- references auth.users(id), which isn't exposed, so `useTeamMembers`'s
-- `.select('*, users(id, name, email)')` was failing with PGRST200 ("no
-- relationship found"). Adding a FK to public.users(id) — safe and always
-- satisfiable, since public.users.id is itself constrained to auth.users(id)
-- and a users row always exists before someone can be added to a team.
alter table public.team_members
  add constraint team_members_user_id_public_users_fkey
  foreign key (user_id) references public.users(id) on delete cascade;
