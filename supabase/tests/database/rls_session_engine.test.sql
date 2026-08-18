-- ============================================================
-- RLS tests for the convergence session engine (spec §16, Phase 1).
-- Same pattern as rls_tier_isolation.test.sql: set request.jwt.claim.sub +
-- role authenticated to simulate a given user. Run via `supabase test db`
-- (needs Docker; not runnable on this machine — see README).
-- ============================================================

begin;
select plan(8);

-- ------------------------------------------------------------
-- Fixtures: one org, one team, two members + a non-member outsider, one
-- vision session with both members as participants.
-- ------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'session-a@test.eol', 'x', now(), now(), now(), '{}', '{}'),
  ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'session-b@test.eol', 'x', now(), now(), now(), '{}', '{}'),
  ('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'session-outsider@test.eol', 'x', now(), now(), now(), '{}', '{}');

insert into public.users (id, email, name) values
  ('55555555-5555-5555-5555-555555555555', 'session-a@test.eol', 'Session A'),
  ('66666666-6666-6666-6666-666666666666', 'session-b@test.eol', 'Session B'),
  ('77777777-7777-7777-7777-777777777777', 'session-outsider@test.eol', 'Session Outsider')
on conflict (id) do update set email = excluded.email, name = excluded.name;

insert into public.organizations (id, name) values ('aaaaaaaa-0000-0000-0000-000000000002', 'Session Test Org');
insert into public.org_members (org_id, user_id, org_role) values
  ('aaaaaaaa-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', 'admin');

insert into public.teams (id, org_id, name) values ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'Session Test Team');
insert into public.team_members (team_id, user_id, team_role) values
  ('bbbbbbbb-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', 'facilitator'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '66666666-6666-6666-6666-666666666666', 'member');

insert into public.convergence_sessions (id, team_id, session_type, status, initiator_id, framing) values
  ('cccccccc-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'vision', 'collecting', '55555555-5555-5555-5555-555555555555', '{"scope": "this team"}');

insert into public.session_participants (session_id, user_id) values
  ('cccccccc-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555'),
  ('cccccccc-0000-0000-0000-000000000002', '66666666-6666-6666-6666-666666666666');

-- User A's mid-session vision-answer reflection (tier 1).
insert into public.private_reflections (id, user_id, team_id, session_id, kind, content) values
  ('dddddddd-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', 'bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000002', 'vision_answer', '{"building": "a trust machine"}');

-- ------------------------------------------------------------
-- 1) A fellow session participant cannot read User A's mid-session reflection.
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';

select is(
  (select count(*)::int from public.private_reflections where id = 'dddddddd-0000-0000-0000-000000000002'),
  0,
  'A fellow session participant cannot read another participant''s mid-session private_reflections row'
);

-- ------------------------------------------------------------
-- 2) A team member CAN read the convergence_sessions row and see progress.
-- ------------------------------------------------------------
select is(
  (select count(*)::int from public.convergence_sessions where id = 'cccccccc-0000-0000-0000-000000000002'),
  1,
  'A team member can read the team''s convergence_sessions row'
);

select is(
  (select count(*)::int from public.session_participants where session_id = 'cccccccc-0000-0000-0000-000000000002'),
  2,
  'A team member can read session_participants rows (for progress counts)'
);

reset role;

-- ------------------------------------------------------------
-- 3) A non-team-member cannot read the session at all.
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';

select is(
  (select count(*)::int from public.convergence_sessions where id = 'cccccccc-0000-0000-0000-000000000002'),
  0,
  'A non-team-member cannot read the team''s convergence_sessions row'
);

select is(
  (select count(*)::int from public.session_participants where session_id = 'cccccccc-0000-0000-0000-000000000002'),
  0,
  'A non-team-member cannot read session_participants rows'
);

reset role;

-- ------------------------------------------------------------
-- 4) A participant can flip their own submitted_at, not someone else's.
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';

update public.session_participants set submitted_at = now()
  where session_id = 'cccccccc-0000-0000-0000-000000000002' and user_id = '66666666-6666-6666-6666-666666666666';

select is(
  (select submitted_at is not null from public.session_participants
    where session_id = 'cccccccc-0000-0000-0000-000000000002' and user_id = '66666666-6666-6666-6666-666666666666'),
  true,
  'A participant can update their own session_participants.submitted_at'
);

-- An UPDATE blocked by RLS doesn't throw — it just matches zero rows (unlike
-- INSERT, which always throws on a WITH CHECK failure since there's no
-- existing-row filter to fall back to). So this asserts via a no-op read,
-- not throws_ok.
update public.session_participants set submitted_at = now()
  where session_id = 'cccccccc-0000-0000-0000-000000000002' and user_id = '55555555-5555-5555-5555-555555555555';

select is(
  (select submitted_at from public.session_participants
    where session_id = 'cccccccc-0000-0000-0000-000000000002' and user_id = '55555555-5555-5555-5555-555555555555'),
  null,
  'A participant cannot update someone else''s session_participants row (silently affects 0 rows)'
);

reset role;

-- ------------------------------------------------------------
-- 5) synthesis_jobs: authenticated cannot move a job to running/succeeded —
--    only service_role (the Edge Function) can. Client may only insert queued.
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';

insert into public.synthesis_jobs (id, session_id) values ('eeeeeeee-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000002');

-- Same reasoning as above: no UPDATE policy at all for authenticated means
-- this silently affects 0 rows rather than throwing.
update public.synthesis_jobs set status = 'succeeded' where id = 'eeeeeeee-0000-0000-0000-000000000002';

select is(
  (select status from public.synthesis_jobs where id = 'eeeeeeee-0000-0000-0000-000000000002'),
  'queued',
  'authenticated client cannot change synthesis_jobs status — still queued (only service_role can transition it)'
);

reset role;

select * from finish();
rollback;
