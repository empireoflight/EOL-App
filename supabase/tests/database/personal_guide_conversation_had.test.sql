-- "I've had this conversation" on personal_friction_guides: the owner can set
-- it, only it, and nobody else can touch someone's guide.
begin;
select plan(5);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('a1a1a1a1-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cg-a@test.eol', 'x', now(), now(), now(), '{}', '{}'),
  ('b2b2b2b2-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cg-b@test.eol', 'x', now(), now(), now(), '{}', '{}');
insert into public.users (id, email, name) values
  ('a1a1a1a1-8888-8888-8888-888888888888', 'cg-a@test.eol', 'CG A'),
  ('b2b2b2b2-8888-8888-8888-888888888888', 'cg-b@test.eol', 'CG B')
on conflict (id) do update set email = excluded.email, name = excluded.name;
insert into public.organizations (id, name) values ('0a0a0a0a-8888-8888-8888-888888888888', 'CG Org');
insert into public.org_members (org_id, user_id, org_role) values
  ('0a0a0a0a-8888-8888-8888-888888888888', 'a1a1a1a1-8888-8888-8888-888888888888', 'member'),
  ('0a0a0a0a-8888-8888-8888-888888888888', 'b2b2b2b2-8888-8888-8888-888888888888', 'member');
insert into public.teams (id, org_id, name) values ('0b0b0b0b-8888-8888-8888-888888888888', '0a0a0a0a-8888-8888-8888-888888888888', 'CG Team');
insert into public.team_members (team_id, user_id, team_role) values
  ('0b0b0b0b-8888-8888-8888-888888888888', 'a1a1a1a1-8888-8888-8888-888888888888', 'member'),
  ('0b0b0b0b-8888-8888-8888-888888888888', 'b2b2b2b2-8888-8888-8888-888888888888', 'member')
on conflict (team_id, user_id) do update set team_role = excluded.team_role;

insert into public.personal_friction_guides (id, user_id, team_id, topic, answers, guide) values
  ('11111111-9999-9999-9999-999999999999', 'a1a1a1a1-8888-8888-8888-888888888888', '0b0b0b0b-8888-8888-8888-888888888888', 'How we decide', '{}', '{}');

set local role authenticated;
set local request.jwt.claim.sub = 'b2b2b2b2-8888-8888-8888-888888888888';

-- A teammate's update matches no rows they can see, so it changes nothing.
update public.personal_friction_guides set conversation_had_at = now() where id = '11111111-9999-9999-9999-999999999999';

set local request.jwt.claim.sub = 'a1a1a1a1-8888-8888-8888-888888888888';

select is(
  (select conversation_had_at from public.personal_friction_guides where id = '11111111-9999-9999-9999-999999999999'),
  null,
  'A teammate cannot mark someone else''s guide'
);

select lives_ok(
  $$ update public.personal_friction_guides set conversation_had_at = now() where id = '11111111-9999-9999-9999-999999999999' $$,
  'The owner can mark their guide as having had the conversation'
);

select isnt(
  (select conversation_had_at from public.personal_friction_guides where id = '11111111-9999-9999-9999-999999999999'),
  null,
  'The mark is saved'
);

select throws_ok(
  $$ update public.personal_friction_guides set topic = 'Rewritten' where id = '11111111-9999-9999-9999-999999999999' $$,
  '42501',
  null,
  'The owner cannot edit what the guide says'
);

select throws_ok(
  $$ update public.personal_friction_guides set user_id = 'b2b2b2b2-8888-8888-8888-888888888888' where id = '11111111-9999-9999-9999-999999999999' $$,
  '42501',
  null,
  'The owner cannot hand the guide to someone else'
);

select * from finish();
rollback;
