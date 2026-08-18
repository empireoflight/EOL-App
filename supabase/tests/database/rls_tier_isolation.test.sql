-- ============================================================
-- RLS tier isolation tests (pgTAP)
--
-- Run via `supabase test db` (needs Docker; see README — not runnable on
-- this machine today, first real execution is in CI).
--
-- Simulates being a given user the same way Supabase's PostgREST does: set
-- the `request.jwt.claim.sub` GUC to that user's id and switch to the
-- `authenticated` role so RLS actually applies (superuser/postgres bypasses
-- RLS entirely, which would make every assertion here trivially pass).
-- ============================================================

begin;
select plan(9);

-- ------------------------------------------------------------
-- Fixtures: one org, one team, three users.
-- user_admin is BOTH an org admin AND a team member of the same team as
-- user_a — this is the specific configuration the hard rule in spec §9
-- exists to cover (being an admin must confer zero extra access to
-- tier-1/2 data, even for someone who is otherwise a legitimate teammate).
-- ------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user-a@test.eol', 'x', now(), now(), now(), '{}', '{}'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user-b@test.eol', 'x', now(), now(), now(), '{}', '{}'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user-admin@test.eol', 'x', now(), now(), now(), '{}', '{}');

-- handle_new_user() already inserted a row per fixture off the raw_user_meta_data-less
-- auth.users insert above; this overwrites it with the human-readable test names.
insert into public.users (id, email, name) values
  ('11111111-1111-1111-1111-111111111111', 'user-a@test.eol', 'User A'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@test.eol', 'User B'),
  ('33333333-3333-3333-3333-333333333333', 'user-admin@test.eol', 'User Admin')
on conflict (id) do update set email = excluded.email, name = excluded.name;

insert into public.organizations (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Test Org');

insert into public.org_members (org_id, user_id, org_role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'member'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'member'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'admin');

insert into public.teams (id, org_id, name) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Test Team');

insert into public.team_members (team_id, user_id, team_role) values
  ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'member'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'member'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'facilitator');

-- User A's private reflection (tier 1).
insert into public.private_reflections (id, user_id, team_id, kind, content) values
  ('cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-0000-0000-0000-000000000001', 'checkin_text', '{"text": "feeling burnt out this week"}');

-- A valid tier-3 aggregate written the way an Edge Function (service_role) would.
insert into public.team_signals (id, team_id, source, signal_type, value, contributor_count) values
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'checkin', 'mood_avg', '{"avg": 3.4}', 3);

-- ------------------------------------------------------------
-- 1) User B cannot see User A's private reflection.
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select is(
  (select count(*)::int from public.private_reflections where id = 'cccccccc-0000-0000-0000-000000000001'),
  0,
  'User B cannot read User A''s private_reflections row'
);

reset role;

-- ------------------------------------------------------------
-- 2) The org admin — who is ALSO a facilitator on User A's own team —
--    still cannot see User A's private reflection. This is the hard rule.
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select is(
  (select count(*)::int from public.private_reflections where id = 'cccccccc-0000-0000-0000-000000000001'),
  0,
  'Org admin (also team facilitator) cannot read a teammate''s private_reflections row'
);

reset role;

-- ------------------------------------------------------------
-- 3) User A can read their own private reflection.
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select is(
  (select count(*)::int from public.private_reflections where id = 'cccccccc-0000-0000-0000-000000000001'),
  1,
  'User A can read their own private_reflections row'
);

-- ------------------------------------------------------------
-- 4) User A cannot insert a private reflection under someone else's id.
-- ------------------------------------------------------------
select throws_ok(
  $$ insert into public.private_reflections (user_id, team_id, kind, content)
     values ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-0000-0000-0000-000000000001', 'checkin_text', '{"text": "spoofed"}') $$,
  'new row violates row-level security policy for table "private_reflections"',
  'User A cannot insert a private_reflections row owned by someone else'
);

reset role;

-- ------------------------------------------------------------
-- 5) A team member CAN read the team's tier-3 aggregate.
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select is(
  (select count(*)::int from public.team_signals where id = 'dddddddd-0000-0000-0000-000000000001'),
  1,
  'A team member can read the team''s tier-3 team_signals row'
);

reset role;

-- ------------------------------------------------------------
-- 6) A non-team-member cannot read the team's tier-3 aggregate.
-- ------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user-outsider@test.eol', 'x', now(), now(), now(), '{}', '{}');
insert into public.users (id, email, name) values ('44444444-4444-4444-4444-444444444444', 'user-outsider@test.eol', 'User Outsider')
  on conflict (id) do update set email = excluded.email, name = excluded.name;

set local role authenticated;
set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

select is(
  (select count(*)::int from public.team_signals where id = 'dddddddd-0000-0000-0000-000000000001'),
  0,
  'A user outside the team cannot read the team''s tier-3 team_signals row'
);

-- ------------------------------------------------------------
-- 7) `authenticated` role cannot INSERT into team_signals directly — only
--    service_role (used by the Edge Function) can write tier-3 data.
-- ------------------------------------------------------------
select throws_ok(
  $$ insert into public.team_signals (team_id, source, signal_type, value, contributor_count)
     values ('bbbbbbbb-0000-0000-0000-000000000001', 'manual', 'test', '{}', 5) $$,
  'new row violates row-level security policy for table "team_signals"',
  'authenticated client cannot insert directly into team_signals'
);

reset role;

-- ------------------------------------------------------------
-- 8) service_role CAN write team_signals (the intended Edge Function path).
-- ------------------------------------------------------------
set local role service_role;

select lives_ok(
  $$ insert into public.team_signals (team_id, source, signal_type, value, contributor_count)
     values ('bbbbbbbb-0000-0000-0000-000000000001', 'manual', 'test', '{}', 5) $$,
  'service_role can insert into team_signals (the Edge Function write path)'
);

reset role;

-- ------------------------------------------------------------
-- 9) The n>=3 rule is enforced at the DB layer even for service_role —
--    defense-in-depth beyond the Edge Function's own application logic.
-- ------------------------------------------------------------
set local role service_role;

select throws_ok(
  $$ insert into public.team_signals (team_id, source, signal_type, value, contributor_count)
     values ('bbbbbbbb-0000-0000-0000-000000000001', 'manual', 'test', '{}', 2) $$,
  'new row for relation "team_signals" violates check constraint "team_signals_contributor_count_check"',
  'team_signals rejects contributor_count < 3 even from service_role'
);

reset role;

select * from finish();
rollback;
