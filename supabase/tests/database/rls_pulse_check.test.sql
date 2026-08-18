-- ============================================================
-- RLS tests for the weekly pulse check tables: pulse_vibe_scores and
-- pulse_energy_notes (free-text gave/drained energy, tier 2). Same hard
-- rule as private_reflections (spec §9, §14) — owner-only, no role-based
-- bypass, ever, including for an org admin who is also the team's
-- facilitator.
--
-- Run via `supabase test db` (needs Docker; not runnable on this machine —
-- see README).
-- ============================================================

begin;
select plan(8);

-- ------------------------------------------------------------
-- Fixtures: one org, one team, two users. User Admin is both an org admin
-- AND the team's facilitator — the specific configuration the hard rule in
-- spec §9 exists to cover.
-- ------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('cccccccc-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pulse-a@test.eol', 'x', now(), now(), now(), '{}', '{}'),
  ('dddddddd-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pulse-admin@test.eol', 'x', now(), now(), now(), '{}', '{}');

insert into public.users (id, email, name) values
  ('cccccccc-2222-2222-2222-222222222222', 'pulse-a@test.eol', 'Pulse A'),
  ('dddddddd-2222-2222-2222-222222222222', 'pulse-admin@test.eol', 'Pulse Admin')
on conflict (id) do update set email = excluded.email, name = excluded.name;

insert into public.organizations (id, name) values ('eeeeeeee-2222-2222-2222-222222222222', 'Pulse Test Org');
insert into public.org_members (org_id, user_id, org_role) values
  ('eeeeeeee-2222-2222-2222-222222222222', 'cccccccc-2222-2222-2222-222222222222', 'member'),
  ('eeeeeeee-2222-2222-2222-222222222222', 'dddddddd-2222-2222-2222-222222222222', 'admin');

insert into public.teams (id, org_id, name) values ('ffffffff-2222-2222-2222-222222222222', 'eeeeeeee-2222-2222-2222-222222222222', 'Pulse Test Team');
insert into public.team_members (team_id, user_id, team_role) values
  ('ffffffff-2222-2222-2222-222222222222', 'cccccccc-2222-2222-2222-222222222222', 'member'),
  ('ffffffff-2222-2222-2222-222222222222', 'dddddddd-2222-2222-2222-222222222222', 'facilitator');

-- User A submits a pulse check.
set local role authenticated;
set local request.jwt.claim.sub = 'cccccccc-2222-2222-2222-222222222222';

insert into public.pulse_vibe_scores (id, user_id, team_id, week_of, score) values
  ('11111111-3333-3333-3333-333333333333', 'cccccccc-2222-2222-2222-222222222222', 'ffffffff-2222-2222-2222-222222222222', '2026-08-10', 4);

insert into public.pulse_energy_notes (id, user_id, team_id, week_of, direction, text) values
  ('22222222-3333-3333-3333-333333333333', 'cccccccc-2222-2222-2222-222222222222', 'ffffffff-2222-2222-2222-222222222222', '2026-08-10', 'drained', 'Too many meetings this week.');

reset role;

-- ------------------------------------------------------------
-- 1) User A can read their own pulse_vibe_scores row.
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = 'cccccccc-2222-2222-2222-222222222222';

select is(
  (select count(*)::int from public.pulse_vibe_scores where id = '11111111-3333-3333-3333-333333333333'),
  1,
  'User A can read their own pulse_vibe_scores row'
);

select is(
  (select count(*)::int from public.pulse_energy_notes where id = '22222222-3333-3333-3333-333333333333'),
  1,
  'User A can read their own pulse_energy_notes row'
);

reset role;

-- ------------------------------------------------------------
-- 2) The org admin — who is ALSO the team's facilitator — still cannot
--    read User A's pulse data. This is the hard rule.
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = 'dddddddd-2222-2222-2222-222222222222';

select is(
  (select count(*)::int from public.pulse_vibe_scores where id = '11111111-3333-3333-3333-333333333333'),
  0,
  'Org admin (also team facilitator) cannot read a teammate''s pulse_vibe_scores row'
);

select is(
  (select count(*)::int from public.pulse_energy_notes where id = '22222222-3333-3333-3333-333333333333'),
  0,
  'Org admin (also team facilitator) cannot read a teammate''s pulse_energy_notes row'
);

-- ------------------------------------------------------------
-- 3) The admin cannot insert a pulse row under User A's identity either.
-- ------------------------------------------------------------
select throws_ok(
  $$ insert into public.pulse_vibe_scores (user_id, team_id, week_of, score)
     values ('cccccccc-2222-2222-2222-222222222222', 'ffffffff-2222-2222-2222-222222222222', '2026-08-10', 1) $$,
  'new row violates row-level security policy for table "pulse_vibe_scores"',
  'Admin cannot insert a pulse_vibe_scores row under someone else''s identity'
);

select throws_ok(
  $$ insert into public.pulse_energy_notes (user_id, team_id, week_of, direction, text)
     values ('cccccccc-2222-2222-2222-222222222222', 'ffffffff-2222-2222-2222-222222222222', '2026-08-10', 'gave', 'Shipped something.') $$,
  'new row violates row-level security policy for table "pulse_energy_notes"',
  'Admin cannot insert a pulse_energy_notes row under someone else''s identity'
);

reset role;

-- ------------------------------------------------------------
-- 4) The admin CAN write their own pulse rows (owner-only, not blanket-denied).
-- ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = 'dddddddd-2222-2222-2222-222222222222';

select lives_ok(
  $$ insert into public.pulse_vibe_scores (user_id, team_id, week_of, score)
     values ('dddddddd-2222-2222-2222-222222222222', 'ffffffff-2222-2222-2222-222222222222', '2026-08-10', 3) $$,
  'Admin can insert their own pulse_vibe_scores row'
);

select lives_ok(
  $$ insert into public.pulse_energy_notes (user_id, team_id, week_of, direction, text)
     values ('dddddddd-2222-2222-2222-222222222222', 'ffffffff-2222-2222-2222-222222222222', '2026-08-10', 'gave', 'Shipped something.') $$,
  'Admin can insert their own pulse_energy_notes row'
);

reset role;

select * from finish();
rollback;
