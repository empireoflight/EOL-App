-- Temporary, deliberate stopgap: kelly@empireoflightcollective.com stays a
-- facilitator on every team, present and future, so she never loses the
-- ability to generate the synthesis guide or facilitate the discussion —
-- both are core to the consulting arrangement itself, not incidental.
-- Intended to be replaced once a proper "transfer/remove facilitator"
-- feature ships — this migration (and the trigger it creates) should be
-- reconsidered at that point, not carried forward indefinitely.

-- Backfill: upgrade her to facilitator on every existing team (inserts her
-- as a member if she isn't one yet, upgrades the role if she already is).
insert into public.team_members (team_id, user_id, team_role)
select t.id, u.id, 'facilitator'
from public.teams t
cross join public.users u
where u.email = 'kelly@empireoflightcollective.com'
on conflict (team_id, user_id) do update set team_role = 'facilitator';

-- Going forward: every newly created team gets her added automatically.
-- Silently no-ops if she doesn't have a public.users row yet on this
-- environment (e.g. local dev, or before her first sign-in on a fresh
-- project) — never blocks team creation.
create or replace function public.ensure_kelly_is_facilitator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kelly_id uuid;
begin
  select id into v_kelly_id from public.users where email = 'kelly@empireoflightcollective.com';
  if v_kelly_id is not null then
    insert into public.team_members (team_id, user_id, team_role)
    values (new.id, v_kelly_id, 'facilitator')
    on conflict (team_id, user_id) do update set team_role = 'facilitator';
  end if;
  return new;
end;
$$;

drop trigger if exists ensure_kelly_is_facilitator_trigger on public.teams;
create trigger ensure_kelly_is_facilitator_trigger
  after insert on public.teams
  for each row execute function public.ensure_kelly_is_facilitator();
