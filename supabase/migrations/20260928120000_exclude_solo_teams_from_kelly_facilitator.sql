-- ensure_kelly_is_facilitator_trigger (20260818080000) adds
-- kelly@empireoflightcollective.com as a facilitator to every team on
-- creation, with no exceptions — including a "just for me" solo space,
-- where that's actively wrong: a solo team's vision session seeds
-- session_participants from every team_member, and the default readiness
-- gate requires all of them to submit, so a stranger's private space would
-- silently be waiting on a facilitator-level account that never submits
-- (worked around today only because the real owner can "Generate now
-- anyway" as a facilitator themselves — not a real fix). Team-mode teams
-- are unaffected: she should still be aware of and able to facilitate every
-- pilot team created that way.
--
-- teams has no prior signal for "created as a solo space" — add one
-- explicitly, set at creation time, rather than guessing after the fact
-- from team/org name equality or org_members count (both true early in a
-- team-mode team's life too, before anyone's been invited yet).
alter table public.teams add column if not exists is_solo boolean not null default false;

-- `create or replace` can't change a function's parameter list — it just
-- adds a second overload alongside the old (uuid, text) one, and then
-- PostgREST can't tell which to call for a request that only sends
-- p_org_id/p_name (both signatures match once p_is_solo has a default).
-- Drop the old signature explicitly so there's exactly one create_team.
drop function if exists public.create_team(uuid, text);

create or replace function public.create_team(p_org_id uuid, p_name text, p_is_solo boolean default false)
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
  insert into public.teams (org_id, name, is_solo) values (p_org_id, p_name, p_is_solo) returning * into new_team;
  insert into public.team_members (team_id, user_id, team_role) values (new_team.id, auth.uid(), 'facilitator')
    on conflict (team_id, user_id) do update set team_role = 'facilitator';
  return new_team;
end;
$$;

create or replace function public.ensure_kelly_is_facilitator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kelly_id uuid;
begin
  if new.is_solo then
    return new;
  end if;
  select id into v_kelly_id from public.users where email = 'kelly@empireoflightcollective.com';
  if v_kelly_id is not null then
    insert into public.team_members (team_id, user_id, team_role)
    values (new.id, v_kelly_id, 'facilitator')
    on conflict (team_id, user_id) do update set team_role = 'facilitator';
  end if;
  return new;
end;
$$;

-- Note: this only prevents the auto-add on solo teams created from here on.
-- It does not retroactively identify or clean up any solo team created
-- before this migration, since there's no reliable way to distinguish those
-- from early-stage team-mode teams after the fact — that's a manual cleanup
-- if and when specific pre-existing solo teams are identified.
