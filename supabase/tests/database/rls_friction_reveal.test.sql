-- ============================================================
-- RLS tests for the friction simultaneous-reveal gate (spec §16).
--
-- This is the single most important privacy guarantee in the friction flow:
-- no one — not even a fellow participant — sees another's Phase 2 authored
-- answer until every participant has submitted, and only actual
-- participants ever see the reveal at all (not the whole team).
--
-- Run via `supabase test db` (needs Docker; not runnable on this machine —
-- see README).
-- ============================================================

begin;
select plan(9);

-- ------------------------------------------------------------
-- Fixtures: one org, one team, four users.
-- A and B are the two participants in a friction session. C is a team
-- member but NOT a participant in this session (tests that the reveal is
-- scoped to participants, not "anyone on the team"). D is not on the team
-- at all.
-- ------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'friction-a@test.eol', 'x', now(), now(), now(), '{}', '{}'),
  ('99999999-9999-9999-9999-999999999999', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'friction-b@test.eol', 'x', now(), now(), now(), '{}', '{}'),
  ('aaaaaaaa-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'friction-c@test.eol', 'x', now(), now(), now(), '{}', '{}'),
  ('bbbbbbbb-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'friction-d@test.eol', 'x', now(), now(), now(), '{}', '{}');

insert into public.users (id, email, name) values
  ('88888888-8888-8888-8888-888888888888', 'friction-a@test.eol', 'Friction A'),
  ('99999999-9999-9999-9999-999999999999', 'friction-b@test.eol', 'Friction B'),
  ('aaaaaaaa-1111-1111-1111-111111111111', 'friction-c@test.eol', 'Friction C'),
  ('bbbbbbbb-1111-1111-1111-111111111111', 'friction-d@test.eol', 'Friction D');

insert into public.organizations (id, name) values ('cccccccc-1111-1111-1111-111111111111', 'Friction Test Org');
insert into public.org_members (org_id, user_id, org_role) values
  ('cccccccc-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888', 'admin');

insert into public.teams (id, org_id, name) values ('dddddddd-1111-1111-1111-111111111111', 'cccccccc-1111-1111-1111-111111111111', 'Friction Test Team');
-- A, B, and C are all team members. C is deliberately NOT a session participant below.
insert into public.team_members (team_id, user_id, team_role) values
  ('dddddddd-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888', 'facilitator'),
  ('dddddddd-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999999', 'member'),
  ('dddddddd-1111-1111-1111-111111111111', 'aaaaaaaa-1111-1111-1111-111111111111', 'member');

insert into public.convergence_sessions (id, team_id, session_type, status, initiator_id, framing) values
  ('eeeeeeee-1111-1111-1111-111111111111', 'dddddddd-1111-1111-1111-111111111111', 'friction', 'collecting', '88888888-8888-8888-8888-888888888888', '{"topic": "how we make decisions in standup"}');

-- Only A and B are participants — C is a team member but not in this session.
insert into public.session_participants (session_id, user_id) values
  ('eeeeeeee-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888'),
  ('eeeeeeee-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999999');

-- A submits their Phase 2 answer. B has not submitted yet — gate not met.
set local role authenticated;
set local request.jwt.claim.sub = '88888888-8888-8888-8888-888888888888';
insert into public.friction_session_responses (id, session_id, user_id, problem_summary, hopes, what_matters) values
  ('ffffffff-1111-1111-1111-111111111111', 'eeeeeeee-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888', 'We keep talking past each other in standup', 'A shared way of deciding, not a debate every time', 'Being heard, not necessarily being right');
reset role;

-- ------------------------------------------------------------
-- 1) A can always read their own response, gate or no gate.
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '88888888-8888-8888-8888-888888888888';

select is(
  (select count(*)::int from public.friction_session_responses where id = 'ffffffff-1111-1111-1111-111111111111'),
  1,
  'The author can always read their own friction_session_responses row'
);

reset role;

-- ------------------------------------------------------------
-- 2) B — a fellow participant — cannot read A's response yet, because B
--    hasn't submitted their own (gate requires ALL participants submitted).
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999';

select is(
  (select count(*)::int from public.friction_session_responses where id = 'ffffffff-1111-1111-1111-111111111111'),
  0,
  'A fellow participant cannot read another''s response before the reveal gate is met'
);

reset role;

-- ------------------------------------------------------------
-- 3) B now submits their own response — gate is met (both participants
--    have submitted_at set).
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999';
insert into public.friction_session_responses (id, session_id, user_id, problem_summary, hopes, what_matters) values
  ('ffffffff-2222-2222-2222-222222222222', 'eeeeeeee-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999999', 'I think we agree more than it feels like in the room', 'Less friction, more momentum', 'Moving fast without steamrolling anyone');
reset role;

update public.session_participants set submitted_at = now()
  where session_id = 'eeeeeeee-1111-1111-1111-111111111111';

select is(
  (select public.all_participants_submitted('eeeeeeee-1111-1111-1111-111111111111')),
  true,
  'all_participants_submitted() is true once every participant has submitted_at set'
);

-- ------------------------------------------------------------
-- 4) Now B can read A's response, and A can read B's response.
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999';

select is(
  (select count(*)::int from public.friction_session_responses where id = 'ffffffff-1111-1111-1111-111111111111'),
  1,
  'B can read A''s response once the reveal gate is met'
);

reset role;

set local role authenticated;
set local request.jwt.claim.sub = '88888888-8888-8888-8888-888888888888';

select is(
  (select count(*)::int from public.friction_session_responses where id = 'ffffffff-2222-2222-2222-222222222222'),
  1,
  'A can read B''s response once the reveal gate is met'
);

reset role;

-- ------------------------------------------------------------
-- 5) C — a team member but NOT a session participant — sees nothing, even
--    after the gate is met. The reveal is scoped to participants, not the
--    whole team.
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-1111-1111-1111-111111111111';

select is(
  (select count(*)::int from public.friction_session_responses where session_id = 'eeeeeeee-1111-1111-1111-111111111111'),
  0,
  'A team member who is not a session participant reads nothing, even after the reveal gate is met'
);

reset role;

-- ------------------------------------------------------------
-- 6) D — not on the team at all — sees nothing either.
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = 'bbbbbbbb-1111-1111-1111-111111111111';

select is(
  (select count(*)::int from public.friction_session_responses where session_id = 'eeeeeeee-1111-1111-1111-111111111111'),
  0,
  'A non-team-member reads nothing'
);

reset role;

-- ------------------------------------------------------------
-- 7) A cannot insert a response under B's identity.
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '88888888-8888-8888-8888-888888888888';

select throws_ok(
  $$ insert into public.friction_session_responses (session_id, user_id, problem_summary, hopes, what_matters)
     values ('eeeeeeee-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999999', 'spoofed', 'spoofed', 'spoofed') $$,
  'new row violates row-level security policy for table "friction_session_responses"',
  'A cannot insert a friction_session_responses row under someone else''s identity'
);

reset role;

-- ------------------------------------------------------------
-- 8) Sanity check on the two-person session's readiness count via the same
--    machinery convergence sessions use elsewhere.
-- ------------------------------------------------------------
select is(
  (select count(*)::int from public.session_participants where session_id = 'eeeeeeee-1111-1111-1111-111111111111' and submitted_at is not null),
  2,
  'Both participants show as submitted'
);

select * from finish();
rollback;
