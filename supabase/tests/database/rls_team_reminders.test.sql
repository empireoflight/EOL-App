-- ============================================================
-- Team reminder-email switch: only a team's facilitator can flip it (teams
-- UPDATE itself is org-admin-only, so this goes through a narrow RPC), and a
-- plain member or outsider can't.
--
-- Run via `supabase test db` (needs Docker).
-- ============================================================

begin;
select plan(5);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('a5a5a5a5-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rem-member@test.eol', 'x', now(), now(), now(), '{}', '{}'),
  ('f6f6f6f6-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rem-fac@test.eol', 'x', now(), now(), now(), '{}', '{}'),
  ('e7e7e7e7-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rem-out@test.eol', 'x', now(), now(), now(), '{}', '{}');

insert into public.users (id, email, name) values
  ('a5a5a5a5-5555-5555-5555-555555555555', 'rem-member@test.eol', 'Rem Member'),
  ('f6f6f6f6-5555-5555-5555-555555555555', 'rem-fac@test.eol', 'Rem Fac'),
  ('e7e7e7e7-5555-5555-5555-555555555555', 'rem-out@test.eol', 'Rem Out')
on conflict (id) do update set email = excluded.email, name = excluded.name;

insert into public.organizations (id, name) values ('0c0c0c0c-5555-5555-5555-555555555555', 'Rem Test Org');
insert into public.org_members (org_id, user_id, org_role) values
  ('0c0c0c0c-5555-5555-5555-555555555555', 'a5a5a5a5-5555-5555-5555-555555555555', 'member'),
  ('0c0c0c0c-5555-5555-5555-555555555555', 'f6f6f6f6-5555-5555-5555-555555555555', 'member');

insert into public.teams (id, org_id, name) values ('0d0d0d0d-5555-5555-5555-555555555555', '0c0c0c0c-5555-5555-5555-555555555555', 'Rem Test Team');
insert into public.team_members (team_id, user_id, team_role) values
  ('0d0d0d0d-5555-5555-5555-555555555555', 'a5a5a5a5-5555-5555-5555-555555555555', 'member'),
  ('0d0d0d0d-5555-5555-5555-555555555555', 'f6f6f6f6-5555-5555-5555-555555555555', 'facilitator')
on conflict (team_id, user_id) do update set team_role = excluded.team_role;

select is(
  (select reminders_enabled from public.teams where id = '0d0d0d0d-5555-5555-5555-555555555555'),
  true,
  'Reminders default to on'
);

set local role authenticated;
set local request.jwt.claim.sub = 'a5a5a5a5-5555-5555-5555-555555555555';

select throws_ok(
  $$ select public.set_team_reminders_enabled('0d0d0d0d-5555-5555-5555-555555555555', false) $$,
  'Only a facilitator can change this team''s reminder emails',
  'A plain member cannot switch reminders off'
);

set local request.jwt.claim.sub = 'e7e7e7e7-5555-5555-5555-555555555555';

select throws_ok(
  $$ select public.set_team_reminders_enabled('0d0d0d0d-5555-5555-5555-555555555555', false) $$,
  'Only a facilitator can change this team''s reminder emails',
  'An outsider cannot switch reminders off'
);

set local request.jwt.claim.sub = 'f6f6f6f6-5555-5555-5555-555555555555';

select lives_ok(
  $$ select public.set_team_reminders_enabled('0d0d0d0d-5555-5555-5555-555555555555', false) $$,
  'The facilitator can switch reminders off'
);

reset role;

select is(
  (select reminders_enabled from public.teams where id = '0d0d0d0d-5555-5555-5555-555555555555'),
  false,
  'The switch actually took effect'
);

select * from finish();
rollback;
