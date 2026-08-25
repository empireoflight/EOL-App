-- Shareable, reusable team invite links — an alternative to the existing
-- per-email team_invites, for a facilitator who wants to post one link in
-- Slack/text rather than collect everyone's email address up front. Unlike
-- team_invites, a link isn't addressed to anyone in particular and isn't
-- single-use: any number of different people can accept the same token
-- until a facilitator revokes/regenerates it. One active link per team at a
-- time (the partial unique index below), matching how most tools present
-- "your team's invite link" as a single thing to copy, not a list.
create table public.team_invite_links (
  id           uuid primary key default uuid_generate_v4(),
  team_id      uuid not null references public.teams(id) on delete cascade,
  token        uuid not null default uuid_generate_v4() unique,
  created_by   uuid not null references auth.users(id),
  status       text not null default 'active' check (status in ('active', 'revoked')),
  created_at   timestamptz not null default now()
);

create unique index team_invite_links_one_active_per_team
  on public.team_invite_links(team_id) where status = 'active';

alter table public.team_invite_links enable row level security;

create policy "Facilitators and org admins read team invite links" on public.team_invite_links
  for select using (
    public.is_team_facilitator(team_id)
    or exists (select 1 from public.teams t where t.id = team_id and public.is_org_admin(t.org_id))
  );

create policy "Facilitators and org admins create team invite links" on public.team_invite_links
  for insert with check (
    public.is_team_facilitator(team_id)
    or exists (select 1 from public.teams t where t.id = team_id and public.is_org_admin(t.org_id))
  );

create policy "Facilitators and org admins update team invite links" on public.team_invite_links
  for update using (
    public.is_team_facilitator(team_id)
    or exists (select 1 from public.teams t where t.id = team_id and public.is_org_admin(t.org_id))
  );

-- Same trust model as get_team_invite (spec §... see that function's
-- comment in 20260810120000_phase1_core_loop.sql): the token is the
-- capability, so this only ever returns the one row matching it, and only
-- while still active.
create or replace function public.get_team_invite_link_preview(p_token uuid)
returns table (team_id uuid, team_name text, status text) as $$
  select l.team_id, t.name as team_name, l.status
  from public.team_invite_links l
  join public.teams t on t.id = l.team_id
  where l.token = p_token and l.status = 'active';
$$ language sql security definer stable;

-- Factored out of accept_team_invite so both the per-email and link accept
-- paths share one place for "add the member, then backfill them into any
-- vision session on this team that's still open" (20260814130000).
create or replace function public._join_team_and_open_sessions(p_team_id uuid, p_user_id uuid)
returns public.team_members as $$
declare
  new_membership public.team_members;
begin
  insert into public.team_members (team_id, user_id, team_role)
  values (p_team_id, p_user_id, 'member')
  on conflict (team_id, user_id) do nothing
  returning * into new_membership;

  insert into public.session_participants (session_id, user_id)
  select cs.id, p_user_id
  from public.convergence_sessions cs
  where cs.team_id = p_team_id
    and cs.session_type = 'vision'
    and cs.status <> 'closed'
    and not exists (
      select 1 from public.visions v where v.session_id = cs.id and v.status = 'committed'
    )
  on conflict (session_id, user_id) do nothing;

  return new_membership;
end;
$$ language plpgsql security definer;

create or replace function public.accept_team_invite(p_token uuid)
returns public.team_members as $$
declare
  invite public.team_invites;
  caller_email text;
begin
  select * into invite from public.team_invites where token = p_token and status = 'pending';
  if invite is null then
    raise exception 'invite not found or already used';
  end if;

  select email into caller_email from public.users where id = auth.uid();
  if caller_email is null or caller_email <> invite.email then
    raise exception 'this invite was sent to a different email address';
  end if;

  update public.team_invites set status = 'accepted', accepted_at = now() where id = invite.id;

  return public._join_team_and_open_sessions(invite.team_id, auth.uid());
end;
$$ language plpgsql security definer;

-- No email check, and deliberately doesn't flip a status — a link stays
-- usable for the next person until a facilitator revokes it.
create or replace function public.accept_team_invite_link(p_token uuid)
returns public.team_members as $$
declare
  link public.team_invite_links;
begin
  select * into link from public.team_invite_links where token = p_token and status = 'active';
  if link is null then
    raise exception 'invite link not found or revoked';
  end if;

  return public._join_team_and_open_sessions(link.team_id, auth.uid());
end;
$$ language plpgsql security definer;

-- Atomic "swap the active link" — revoke the old one and create a new one
-- in the same call, so a facilitator regenerating never leaves the team
-- with zero or two active links. security invoker (the default): RLS above
-- already scopes both the update and insert to facilitators/org admins, no
-- privilege escalation needed here.
create or replace function public.regenerate_team_invite_link(p_team_id uuid)
returns public.team_invite_links as $$
declare
  new_link public.team_invite_links;
begin
  update public.team_invite_links set status = 'revoked' where team_id = p_team_id and status = 'active';
  insert into public.team_invite_links (team_id, created_by)
  values (p_team_id, auth.uid())
  returning * into new_link;
  return new_link;
end;
$$ language plpgsql;
