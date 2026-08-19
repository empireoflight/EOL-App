-- Bug: create_team() inserts the creator into team_members with no
-- ON CONFLICT clause. ensure_kelly_is_facilitator_trigger (added in
-- 20260818080000_kelly_always_facilitator.sql) fires AFTER INSERT on
-- teams — which runs *before* create_team()'s own team_members insert in
-- the same function body — and already inserts kelly@empireoflightcollective.com
-- as facilitator. When kelly herself is the one creating the team,
-- create_team()'s second insert then collides on the (team_id, user_id)
-- primary key and the whole RPC fails, silently blocking her from ever
-- creating a new team (solo or otherwise) for as long as that trigger
-- exists. Fix: make the creator's own membership insert idempotent, same
-- as the trigger's own on-conflict handling.
create or replace function public.create_team(p_org_id uuid, p_name text)
returns teams
language plpgsql
security definer
as $$
declare
  new_team public.teams;
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'not a member of this organization';
  end if;
  insert into public.teams (org_id, name) values (p_org_id, p_name) returning * into new_team;
  insert into public.team_members (team_id, user_id, team_role) values (new_team.id, auth.uid(), 'facilitator')
    on conflict (team_id, user_id) do update set team_role = 'facilitator';
  return new_team;
end;
$$;
