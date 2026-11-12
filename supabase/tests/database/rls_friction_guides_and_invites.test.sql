-- ============================================================
-- RLS tests for personal_friction_guides (owner-only, hard rule: not even the
-- team's facilitator can read someone else's), the team/individual-cohort
-- setting, and the session_participants insert rule that enforces it (an
-- individual cohort cannot bring other people into a friction session).
--
-- Run via `supabase test db` (needs Docker).
-- ============================================================

begin;
select plan(17);

-- Fixtures: one team with a facilitator (F), two members (A, B), and an
-- outsider (O).
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('a1a1a1a1-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fg-a@test.eol', 'x', now(), now(), now(), '{}', '{}'),
  ('b2b2b2b2-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fg-b@test.eol', 'x', now(), now(), now(), '{}', '{}'),
  ('f3f3f3f3-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fg-f@test.eol', 'x', now(), now(), now(), '{}', '{}'),
  ('e4e4e4e4-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fg-o@test.eol', 'x', now(), now(), now(), '{}', '{}');

insert into public.users (id, email, name) values
  ('a1a1a1a1-6666-6666-6666-666666666666', 'fg-a@test.eol', 'FG A'),
  ('b2b2b2b2-6666-6666-6666-666666666666', 'fg-b@test.eol', 'FG B'),
  ('f3f3f3f3-6666-6666-6666-666666666666', 'fg-f@test.eol', 'FG F'),
  ('e4e4e4e4-6666-6666-6666-666666666666', 'fg-o@test.eol', 'FG O')
on conflict (id) do update set email = excluded.email, name = excluded.name;

insert into public.organizations (id, name) values ('0a0a0a0a-6666-6666-6666-666666666666', 'FG Test Org');
insert into public.org_members (org_id, user_id, org_role) values
  ('0a0a0a0a-6666-6666-6666-666666666666', 'a1a1a1a1-6666-6666-6666-666666666666', 'member'),
  ('0a0a0a0a-6666-6666-6666-666666666666', 'b2b2b2b2-6666-6666-6666-666666666666', 'member'),
  ('0a0a0a0a-6666-6666-6666-666666666666', 'f3f3f3f3-6666-6666-6666-666666666666', 'member');

insert into public.teams (id, org_id, name) values ('0b0b0b0b-6666-6666-6666-666666666666', '0a0a0a0a-6666-6666-6666-666666666666', 'FG Test Team');
insert into public.team_members (team_id, user_id, team_role) values
  ('0b0b0b0b-6666-6666-6666-666666666666', 'a1a1a1a1-6666-6666-6666-666666666666', 'member'),
  ('0b0b0b0b-6666-6666-6666-666666666666', 'b2b2b2b2-6666-6666-6666-666666666666', 'member'),
  ('0b0b0b0b-6666-6666-6666-666666666666', 'f3f3f3f3-6666-6666-6666-666666666666', 'facilitator')
on conflict (team_id, user_id) do update set team_role = excluded.team_role;

-- A's saved guide (seeded as the table owner, bypassing RLS).
insert into public.personal_friction_guides (id, user_id, team_id, topic, answers, guide) values
  ('11111111-7777-7777-7777-777777777777', 'a1a1a1a1-6666-6666-6666-666666666666', '0b0b0b0b-6666-6666-6666-666666666666', 'How we decide things', '{"problem_summary": "x"}', '{"summary": "y"}');

-- ------------------------------------------------------------
-- personal_friction_guides
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = 'a1a1a1a1-6666-6666-6666-666666666666';

select is(
  (select count(*)::int from public.personal_friction_guides where id = '11111111-7777-7777-7777-777777777777'),
  1,
  'The owner can read their own guide'
);

select lives_ok(
  $$ insert into public.personal_friction_guides (user_id, team_id, topic, answers, guide)
     values ('a1a1a1a1-6666-6666-6666-666666666666', '0b0b0b0b-6666-6666-6666-666666666666', 'Another one', '{}', '{}') $$,
  'The owner can save a guide for a team they are on'
);

select throws_ok(
  $$ insert into public.personal_friction_guides (user_id, team_id, topic, answers, guide)
     values ('b2b2b2b2-6666-6666-6666-666666666666', '0b0b0b0b-6666-6666-6666-666666666666', 'Spoofed', '{}', '{}') $$,
  'new row violates row-level security policy for table "personal_friction_guides"',
  'Nobody can save a guide under someone else''s identity'
);

set local request.jwt.claim.sub = 'b2b2b2b2-6666-6666-6666-666666666666';

select is(
  (select count(*)::int from public.personal_friction_guides where user_id = 'a1a1a1a1-6666-6666-6666-666666666666'),
  0,
  'A teammate cannot read someone else''s guide'
);

set local request.jwt.claim.sub = 'f3f3f3f3-6666-6666-6666-666666666666';

select is(
  (select count(*)::int from public.personal_friction_guides where user_id = 'a1a1a1a1-6666-6666-6666-666666666666'),
  0,
  'The team facilitator cannot read a member''s guide (hard rule)'
);

set local request.jwt.claim.sub = 'e4e4e4e4-6666-6666-6666-666666666666';

select is(
  (select count(*)::int from public.personal_friction_guides),
  0,
  'An outsider cannot read any guides'
);

select throws_ok(
  $$ insert into public.personal_friction_guides (user_id, team_id, topic, answers, guide)
     values ('e4e4e4e4-6666-6666-6666-666666666666', '0b0b0b0b-6666-6666-6666-666666666666', 'Not on this team', '{}', '{}') $$,
  'new row violates row-level security policy for table "personal_friction_guides"',
  'An outsider cannot save a guide into a team they are not on'
);

set local request.jwt.claim.sub = 'b2b2b2b2-6666-6666-6666-666666666666';
delete from public.personal_friction_guides where id = '11111111-7777-7777-7777-777777777777';

reset role;

select is(
  (select count(*)::int from public.personal_friction_guides where id = '11111111-7777-7777-7777-777777777777'),
  1,
  'Someone else cannot delete a guide that is not theirs'
);

-- ------------------------------------------------------------
-- The team / individual cohort setting
-- ------------------------------------------------------------
select is(
  (select team_type from public.teams where id = '0b0b0b0b-6666-6666-6666-666666666666'),
  'team',
  'Groups default to being a team'
);

set local role authenticated;
set local request.jwt.claim.sub = 'a1a1a1a1-6666-6666-6666-666666666666';

select throws_ok(
  $$ select public.set_team_type('0b0b0b0b-6666-6666-6666-666666666666', 'individual_cohort') $$,
  'Only a facilitator can change what kind of group this is',
  'A plain member cannot change the group type'
);

-- A friction session started by member A, who is the only participant so far.
reset role;
insert into public.convergence_sessions (id, team_id, session_type, status, initiator_id) values
  ('22222222-7777-7777-7777-777777777777', '0b0b0b0b-6666-6666-6666-666666666666', 'friction', 'collecting', 'a1a1a1a1-6666-6666-6666-666666666666');

set local role authenticated;
set local request.jwt.claim.sub = 'a1a1a1a1-6666-6666-6666-666666666666';

select lives_ok(
  $$ insert into public.session_participants (session_id, user_id) values ('22222222-7777-7777-7777-777777777777', 'b2b2b2b2-6666-6666-6666-666666666666') $$,
  'In a team, the initiator can bring a teammate into a friction session'
);

-- The facilitator makes this an individual cohort.
set local request.jwt.claim.sub = 'f3f3f3f3-6666-6666-6666-666666666666';
select lives_ok(
  $$ select public.set_team_type('0b0b0b0b-6666-6666-6666-666666666666', 'individual_cohort') $$,
  'The facilitator can make the group an individual cohort'
);

select throws_ok(
  $$ select public.set_team_type('0b0b0b0b-6666-6666-6666-666666666666', 'nonsense') $$,
  'Unknown group type',
  'An unknown group type is rejected'
);

-- A new friction session started by A, now that this is an individual cohort.
reset role;
insert into public.convergence_sessions (id, team_id, session_type, status, initiator_id) values
  ('33333333-7777-7777-7777-777777777777', '0b0b0b0b-6666-6666-6666-666666666666', 'friction', 'collecting', 'a1a1a1a1-6666-6666-6666-666666666666');

set local role authenticated;
set local request.jwt.claim.sub = 'a1a1a1a1-6666-6666-6666-666666666666';

select lives_ok(
  $$ insert into public.session_participants (session_id, user_id) values ('33333333-7777-7777-7777-777777777777', 'a1a1a1a1-6666-6666-6666-666666666666') $$,
  'In an individual cohort, the initiator can still add themselves'
);

select throws_ok(
  $$ insert into public.session_participants (session_id, user_id) values ('33333333-7777-7777-7777-777777777777', 'b2b2b2b2-6666-6666-6666-666666666666') $$,
  'new row violates row-level security policy for table "session_participants"',
  'In an individual cohort, the initiator cannot bring a teammate in'
);

set local request.jwt.claim.sub = 'f3f3f3f3-6666-6666-6666-666666666666';

select throws_ok(
  $$ insert into public.session_participants (session_id, user_id) values ('33333333-7777-7777-7777-777777777777', 'b2b2b2b2-6666-6666-6666-666666666666') $$,
  'new row violates row-level security policy for table "session_participants"',
  'In an individual cohort, even the facilitator cannot add someone else to a friction session'
);

-- Vision sessions are unaffected by the switch.
reset role;
insert into public.convergence_sessions (id, team_id, session_type, status, initiator_id) values
  ('44444444-7777-7777-7777-777777777777', '0b0b0b0b-6666-6666-6666-666666666666', 'vision', 'collecting', 'f3f3f3f3-6666-6666-6666-666666666666');

set local role authenticated;
set local request.jwt.claim.sub = 'f3f3f3f3-6666-6666-6666-666666666666';

select lives_ok(
  $$ insert into public.session_participants (session_id, user_id) values ('44444444-7777-7777-7777-777777777777', 'b2b2b2b2-6666-6666-6666-666666666666') $$,
  'Being an individual cohort does not affect vision sessions'
);

reset role;

select * from finish();
rollback;
