-- The invite-accept flow only ever worked if someone opened the exact
-- /invite/:token link (get_team_invite + accept_team_invite, both keyed on
-- the token). If someone was invited and then just signed up normally —
-- entirely plausible, e.g. they didn't have the link handy — the invite
-- just sits there "pending" forever with nothing surfacing it. This
-- function lets a logged-in user see invites addressed to their OWN email
-- (and only their own — scoped by auth.uid() -> public.users.email, not an
-- open read of team_invites), so the app can show "you're invited to X" on
-- their teams list regardless of how they got there.
create or replace function public.get_my_pending_invites()
returns table (
  id uuid, team_id uuid, team_name text, token uuid, created_at timestamptz
) as $$
  select i.id, i.team_id, t.name as team_name, i.token, i.created_at
  from public.team_invites i
  join public.teams t on t.id = i.team_id
  where i.status = 'pending'
    and i.email = (select email from public.users where id = auth.uid());
$$ language sql security definer stable;
