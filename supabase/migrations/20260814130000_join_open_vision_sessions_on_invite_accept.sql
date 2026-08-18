-- Bug fix: session_participants was a one-time snapshot taken when a vision
-- session was created (VisionStartPage.tsx) — nothing ever added a row for
-- someone who joined the team afterward, so a teammate invited after the
-- session started had no way to submit a reflection at all. Extend
-- accept_team_invite (same security-definer pattern already used for
-- create_team/get_team_invite) to also join the new member into any vision
-- session on that team that's still open — not closed, and not already
-- committed, since a committed vision shouldn't quietly reopen for input.
create or replace function public.accept_team_invite(p_token uuid)
returns public.team_members as $$
declare
  invite public.team_invites;
  caller_email text;
  new_membership public.team_members;
begin
  select * into invite from public.team_invites where token = p_token and status = 'pending';
  if invite is null then
    raise exception 'invite not found or already used';
  end if;

  select email into caller_email from public.users where id = auth.uid();
  if caller_email is null or caller_email <> invite.email then
    raise exception 'this invite was sent to a different email address';
  end if;

  insert into public.team_members (team_id, user_id, team_role)
  values (invite.team_id, auth.uid(), 'member')
  on conflict (team_id, user_id) do nothing
  returning * into new_membership;

  update public.team_invites set status = 'accepted', accepted_at = now() where id = invite.id;

  insert into public.session_participants (session_id, user_id)
  select cs.id, auth.uid()
  from public.convergence_sessions cs
  where cs.team_id = invite.team_id
    and cs.session_type = 'vision'
    and cs.status <> 'closed'
    and not exists (
      select 1 from public.visions v where v.session_id = cs.id and v.status = 'committed'
    )
  on conflict (session_id, user_id) do nothing;

  return new_membership;
end;
$$ language plpgsql security definer;
