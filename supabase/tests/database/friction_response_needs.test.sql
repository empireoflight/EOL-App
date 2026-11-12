-- ============================================================
-- The friction response's first answer moved from problem_summary to needs.
-- New responses carry `needs`; responses saved before keep `problem_summary`;
-- one with neither is rejected.
--
-- Run via `supabase test db` (needs Docker).
-- ============================================================

begin;
select plan(4);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('a1a1a1a1-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fn-a@test.eol', 'x', now(), now(), now(), '{}', '{}'),
  ('b2b2b2b2-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fn-b@test.eol', 'x', now(), now(), now(), '{}', '{}');
insert into public.users (id, email, name) values
  ('a1a1a1a1-8888-8888-8888-888888888888', 'fn-a@test.eol', 'FN A'),
  ('b2b2b2b2-8888-8888-8888-888888888888', 'fn-b@test.eol', 'FN B')
on conflict (id) do update set email = excluded.email, name = excluded.name;
insert into public.organizations (id, name) values ('0a0a0a0a-8888-8888-8888-888888888888', 'FN Org');
insert into public.org_members (org_id, user_id, org_role) values
  ('0a0a0a0a-8888-8888-8888-888888888888', 'a1a1a1a1-8888-8888-8888-888888888888', 'member'),
  ('0a0a0a0a-8888-8888-8888-888888888888', 'b2b2b2b2-8888-8888-8888-888888888888', 'member');
insert into public.teams (id, org_id, name) values ('0b0b0b0b-8888-8888-8888-888888888888', '0a0a0a0a-8888-8888-8888-888888888888', 'FN Team');
insert into public.team_members (team_id, user_id, team_role) values
  ('0b0b0b0b-8888-8888-8888-888888888888', 'a1a1a1a1-8888-8888-8888-888888888888', 'member'),
  ('0b0b0b0b-8888-8888-8888-888888888888', 'b2b2b2b2-8888-8888-8888-888888888888', 'member')
on conflict (team_id, user_id) do nothing;
insert into public.convergence_sessions (id, team_id, session_type, status, initiator_id) values
  ('11111111-9999-9999-9999-999999999999', '0b0b0b0b-8888-8888-8888-888888888888', 'friction', 'collecting', 'a1a1a1a1-8888-8888-8888-888888888888');
insert into public.session_participants (session_id, user_id) values
  ('11111111-9999-9999-9999-999999999999', 'a1a1a1a1-8888-8888-8888-888888888888'),
  ('11111111-9999-9999-9999-999999999999', 'b2b2b2b2-8888-8888-8888-888888888888');

set local role authenticated;
set local request.jwt.claim.sub = 'a1a1a1a1-8888-8888-8888-888888888888';

select lives_ok(
  $$ insert into public.friction_session_responses (session_id, user_id, needs, hopes, what_matters)
     values ('11111111-9999-9999-9999-999999999999', 'a1a1a1a1-8888-8888-8888-888888888888', 'I need to be heard.', 'h', 'w') $$,
  'A new-style response (needs, no problem_summary) can be saved'
);

set local request.jwt.claim.sub = 'b2b2b2b2-8888-8888-8888-888888888888';

select lives_ok(
  $$ insert into public.friction_session_responses (session_id, user_id, problem_summary, hopes, what_matters)
     values ('11111111-9999-9999-9999-999999999999', 'b2b2b2b2-8888-8888-8888-888888888888', 'The old kind of answer.', 'h', 'w') $$,
  'A response in the older shape (problem_summary only) is still accepted'
);

reset role;

select throws_ok(
  $$ insert into public.friction_session_responses (session_id, user_id, hopes, what_matters)
     values ('11111111-9999-9999-9999-999999999999', 'a1a1a1a1-8888-8888-8888-888888888888', 'h', 'w') $$,
  null,
  'A response with neither needs nor problem_summary is rejected'
);

select is(
  (select count(*)::int from public.friction_session_responses where session_id = '11111111-9999-9999-9999-999999999999'),
  2,
  'Only the two valid responses were saved'
);

select * from finish();
rollback;
