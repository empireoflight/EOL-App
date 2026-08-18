-- Pre-existing gap, surfaced while building vision's "Raw answers" section:
-- public.users only ever allowed `auth.uid() = id` (read your own row).
-- Every feature that shows a teammate's name — participant lists, assignee
-- avatars, and now raw vision answers — has silently only ever worked for
-- your own name and fallen back to a placeholder for everyone else. Name
-- and email on a shared team roster were never meant to be private (that's
-- the whole point of team_members/TeamInvitePanel/Avatar existing); this
-- adds the team-scoped read that was missing.
create policy "Team members read each other's profile" on public.users
  for select using (
    exists (
      select 1 from public.team_members tm1
      join public.team_members tm2 on tm1.team_id = tm2.team_id
      where tm1.user_id = auth.uid() and tm2.user_id = users.id
    )
  );
