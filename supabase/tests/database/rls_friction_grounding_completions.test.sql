-- ============================================================
-- RLS tests for friction_grounding_completions — the content-free
-- completion signal for the tier-0 "Ground first" friction flow. Same hard
-- rule as pulse_vibe_scores/private_reflections (spec §9, §14) —
-- owner-only, no role-based bypass, ever, including for an org admin who is
-- also the team's facilitator.
--
-- Run via `supabase test db` (needs Docker; not runnable on this machine —
-- see README).
-- ============================================================

begin;
select plan(6);

-- ------------------------------------------------------------
-- Fixtures: one org, one team, two users. User Admin is both an org admin
-- AND the team's facilitator — the specific configuration the hard rule in
-- spec §9 exists to cover.
-- ------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('cccccccc-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'grounding-a@test.eol', 'x', now(), now(), now(), '{}', '{}'),
  ('dddddddd-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'grounding-admin@test.eol', 'x', now(), now(), now(), '{}', '{}');

insert into public.users (id, email, name) values
  ('cccccccc-4444-4444-4444-444444444444', 'grounding-a@test.eol', 'Grounding A'),
  ('dddddddd-4444-4444-4444-444444444444', 'grounding-admin@test.eol', 'Grounding Admin')
on conflict (id) do update set email = excluded.email, name = excluded.name;

insert into public.organizations (id, name) values ('eeeeeeee-4444-4444-4444-444444444444', 'Grounding Test Org');
insert into public.org_members (org_id, user_id, org_role) values
  ('eeeeeeee-4444-4444-4444-444444444444', 'cccccccc-4444-4444-4444-444444444444', 'member'),
  ('eeeeeeee-4444-4444-4444-444444444444', 'dddddddd-4444-4444-4444-444444444444', 'admin');

insert into public.teams (id, org_id, name) values ('ffffffff-4444-4444-4444-444444444444', 'eeeeeeee-4444-4444-4444-444444444444', 'Grounding Test Team');
insert into public.team_members (team_id, user_id, team_role) values
  ('ffffffff-4444-4444-4444-444444444444', 'cccccccc-4444-4444-4444-444444444444', 'member'),
  ('ffffffff-4444-4444-4444-444444444444', 'dddddddd-4444-4444-4444-444444444444', 'facilitator');

-- User A completes a private grounding session.
set local role authenticated;
set local request.jwt.claim.sub = 'cccccccc-4444-4444-4444-444444444444';

insert into public.friction_grounding_completions (id, user_id, team_id) values
  ('11111111-5555-5555-5555-555555555555', 'cccccccc-4444-4444-4444-444444444444', 'ffffffff-4444-4444-4444-444444444444');

reset role;

-- ------------------------------------------------------------
-- 1) User A can read their own completion row.
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = 'cccccccc-4444-4444-4444-444444444444';

select is(
  (select count(*)::int from public.friction_grounding_completions where id = '11111111-5555-5555-5555-555555555555'),
  1,
  'User A can read their own friction_grounding_completions row'
);

reset role;

-- ------------------------------------------------------------
-- 2) The org admin — who is ALSO the team's facilitator — still cannot
--    read User A's completion row. This is the hard rule: this table
--    stores no content, but who-did-a-private-session-when is still never
--    facilitator-visible.
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = 'dddddddd-4444-4444-4444-444444444444';

select is(
  (select count(*)::int from public.friction_grounding_completions where id = '11111111-5555-5555-5555-555555555555'),
  0,
  'Org admin (also team facilitator) cannot read a teammate''s friction_grounding_completions row'
);

-- ------------------------------------------------------------
-- 3) The admin cannot insert a completion row under User A's identity.
-- ------------------------------------------------------------
select throws_ok(
  $$ insert into public.friction_grounding_completions (user_id, team_id)
     values ('cccccccc-4444-4444-4444-444444444444', 'ffffffff-4444-4444-4444-444444444444') $$,
  'new row violates row-level security policy for table "friction_grounding_completions"',
  'Admin cannot insert a friction_grounding_completions row under someone else''s identity'
);

reset role;

-- ------------------------------------------------------------
-- 4) The admin CAN write their own completion rows (owner-only, not
--    blanket-denied), and read/update/delete them.
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = 'dddddddd-4444-4444-4444-444444444444';

select lives_ok(
  $$ insert into public.friction_grounding_completions (id, user_id, team_id)
     values ('22222222-5555-5555-5555-555555555555', 'dddddddd-4444-4444-4444-444444444444', 'ffffffff-4444-4444-4444-444444444444') $$,
  'Admin can insert their own friction_grounding_completions row'
);

select is(
  (select count(*)::int from public.friction_grounding_completions where id = '22222222-5555-5555-5555-555555555555'),
  1,
  'Admin can read their own friction_grounding_completions row back'
);

select lives_ok(
  $$ delete from public.friction_grounding_completions where id = '22222222-5555-5555-5555-555555555555' $$,
  'Admin can delete their own friction_grounding_completions row'
);

reset role;

select * from finish();
rollback;
