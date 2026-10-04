-- ============================================================
-- RLS tests for team profiles: team_profile_questions (facilitator-defined),
-- team_member_profiles (tier 4 — readable by the whole team, writable only by
-- the owner), and team_profile_matches (personal to the viewer, written only
-- by the edge function via service_role).
--
-- Run via `supabase test db` (needs Docker).
-- ============================================================

begin;
select plan(12);

-- ------------------------------------------------------------
-- Fixtures: one team with a facilitator (F) and two members (A, B), plus an
-- outsider (O) who belongs to no team.
-- ------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('a1a1a1a1-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tp-a@test.eol', 'x', now(), now(), now(), '{}', '{}'),
  ('b2b2b2b2-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tp-b@test.eol', 'x', now(), now(), now(), '{}', '{}'),
  ('f3f3f3f3-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tp-f@test.eol', 'x', now(), now(), now(), '{}', '{}'),
  ('e4e4e4e4-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tp-o@test.eol', 'x', now(), now(), now(), '{}', '{}');

insert into public.users (id, email, name) values
  ('a1a1a1a1-4444-4444-4444-444444444444', 'tp-a@test.eol', 'TP A'),
  ('b2b2b2b2-4444-4444-4444-444444444444', 'tp-b@test.eol', 'TP B'),
  ('f3f3f3f3-4444-4444-4444-444444444444', 'tp-f@test.eol', 'TP F'),
  ('e4e4e4e4-4444-4444-4444-444444444444', 'tp-o@test.eol', 'TP O')
on conflict (id) do update set email = excluded.email, name = excluded.name;

insert into public.organizations (id, name) values ('0a0a0a0a-4444-4444-4444-444444444444', 'TP Test Org');
insert into public.org_members (org_id, user_id, org_role) values
  ('0a0a0a0a-4444-4444-4444-444444444444', 'a1a1a1a1-4444-4444-4444-444444444444', 'member'),
  ('0a0a0a0a-4444-4444-4444-444444444444', 'b2b2b2b2-4444-4444-4444-444444444444', 'member'),
  ('0a0a0a0a-4444-4444-4444-444444444444', 'f3f3f3f3-4444-4444-4444-444444444444', 'member');

insert into public.teams (id, org_id, name) values ('0b0b0b0b-4444-4444-4444-444444444444', '0a0a0a0a-4444-4444-4444-444444444444', 'TP Test Team');
insert into public.team_members (team_id, user_id, team_role) values
  ('0b0b0b0b-4444-4444-4444-444444444444', 'a1a1a1a1-4444-4444-4444-444444444444', 'member'),
  ('0b0b0b0b-4444-4444-4444-444444444444', 'b2b2b2b2-4444-4444-4444-444444444444', 'member'),
  ('0b0b0b0b-4444-4444-4444-444444444444', 'f3f3f3f3-4444-4444-4444-444444444444', 'facilitator')
on conflict (team_id, user_id) do update set team_role = excluded.team_role;

-- Seeded as the table owner (bypasses RLS): A's profile, and one match row
-- per viewer, written the way the edge function would.
insert into public.team_member_profiles (team_id, user_id, answers) values
  ('0b0b0b0b-4444-4444-4444-444444444444', 'a1a1a1a1-4444-4444-4444-444444444444', '{"joy": "hiking"}');

insert into public.team_profile_matches (team_id, viewer_id, other_id, score, reason, input_hash) values
  ('0b0b0b0b-4444-4444-4444-444444444444', 'a1a1a1a1-4444-4444-4444-444444444444', 'b2b2b2b2-4444-4444-4444-444444444444', 80, 'You both love the outdoors.', 'h'),
  ('0b0b0b0b-4444-4444-4444-444444444444', 'b2b2b2b2-4444-4444-4444-444444444444', 'a1a1a1a1-4444-4444-4444-444444444444', 80, 'You both love the outdoors.', 'h');

-- ------------------------------------------------------------
-- team_member_profiles
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = 'b2b2b2b2-4444-4444-4444-444444444444';

select is(
  (select count(*)::int from public.team_member_profiles where user_id = 'a1a1a1a1-4444-4444-4444-444444444444'),
  1,
  'A teammate can read another member''s profile'
);

-- B tries to rewrite A's profile: RLS filters the row out, so nothing changes.
update public.team_member_profiles set answers = '{"joy": "hacked"}' where user_id = 'a1a1a1a1-4444-4444-4444-444444444444';

select throws_ok(
  $$ insert into public.team_member_profiles (team_id, user_id, answers)
     values ('0b0b0b0b-4444-4444-4444-444444444444', 'f3f3f3f3-4444-4444-4444-444444444444', '{}') $$,
  'new row violates row-level security policy for table "team_member_profiles"',
  'A member cannot create a profile under someone else''s identity'
);

select lives_ok(
  $$ insert into public.team_member_profiles (team_id, user_id, answers)
     values ('0b0b0b0b-4444-4444-4444-444444444444', 'b2b2b2b2-4444-4444-4444-444444444444', '{"joy": "pottery"}') $$,
  'A member can create their own profile'
);

reset role;

select is(
  (select answers->>'joy' from public.team_member_profiles where user_id = 'a1a1a1a1-4444-4444-4444-444444444444'),
  'hiking',
  'A member cannot overwrite a teammate''s profile'
);

set local role authenticated;
set local request.jwt.claim.sub = 'e4e4e4e4-4444-4444-4444-444444444444';

select is(
  (select count(*)::int from public.team_member_profiles where team_id = '0b0b0b0b-4444-4444-4444-444444444444'),
  0,
  'An outsider cannot read the team''s profiles'
);

select throws_ok(
  $$ insert into public.team_member_profiles (team_id, user_id, answers)
     values ('0b0b0b0b-4444-4444-4444-444444444444', 'e4e4e4e4-4444-4444-4444-444444444444', '{}') $$,
  'new row violates row-level security policy for table "team_member_profiles"',
  'An outsider cannot add themselves to a team''s profiles'
);

reset role;

-- ------------------------------------------------------------
-- team_profile_questions
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = 'a1a1a1a1-4444-4444-4444-444444444444';

select throws_ok(
  $$ insert into public.team_profile_questions (team_id, questions)
     values ('0b0b0b0b-4444-4444-4444-444444444444', '[]') $$,
  'new row violates row-level security policy for table "team_profile_questions"',
  'A non-facilitator member cannot define the profile questions'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = 'f3f3f3f3-4444-4444-4444-444444444444';

select lives_ok(
  $$ insert into public.team_profile_questions (team_id, questions)
     values ('0b0b0b0b-4444-4444-4444-444444444444', '[{"id": "joy", "prompt": "Fun?", "kind": "interest"}]') $$,
  'The facilitator can define the profile questions'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = 'a1a1a1a1-4444-4444-4444-444444444444';

select is(
  (select count(*)::int from public.team_profile_questions where team_id = '0b0b0b0b-4444-4444-4444-444444444444'),
  1,
  'A member can read the team''s profile questions'
);

-- ------------------------------------------------------------
-- team_profile_matches — still as member A
-- ------------------------------------------------------------
select is(
  (select count(*)::int from public.team_profile_matches where viewer_id = 'b2b2b2b2-4444-4444-4444-444444444444'),
  0,
  'A viewer cannot read another viewer''s matches'
);

select throws_ok(
  $$ insert into public.team_profile_matches (team_id, viewer_id, other_id, score, reason, input_hash)
     values ('0b0b0b0b-4444-4444-4444-444444444444', 'a1a1a1a1-4444-4444-4444-444444444444', 'f3f3f3f3-4444-4444-4444-444444444444', 100, 'Rigged.', 'h') $$,
  'new row violates row-level security policy for table "team_profile_matches"',
  'An authenticated user cannot write their own match results'
);

update public.team_profile_matches set score = 5 where viewer_id = 'a1a1a1a1-4444-4444-4444-444444444444';

reset role;

select is(
  (select score from public.team_profile_matches where viewer_id = 'a1a1a1a1-4444-4444-4444-444444444444'),
  80,
  'An authenticated user cannot edit their own match results'
);

select * from finish();
rollback;
