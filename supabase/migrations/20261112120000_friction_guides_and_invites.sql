-- Two related Unlearn changes:
--   1. personal_friction_guides: a person's own prepared conversation (the
--      situation, their point of view, and the AI-built discussion guide),
--      visible to them and nobody else.
--   2. teams.team_type: whether a group is a 'team' (people working toward a
--      shared vision, who can bring each other into friction sessions) or an
--      'individual_cohort' (people on their own journeys alongside each
--      other, where friction is processed personally and nobody is invited
--      in). The type also drives some wording in the app.

-- ============================================================
-- Personal discussion guides (owner-only)
-- ============================================================
create table public.personal_friction_guides (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  team_id        uuid not null references public.teams(id) on delete cascade,
  topic          text not null,
  friction_type  text,
  -- { problem_summary, hopes, what_matters }, the same three authored
  -- questions a shared friction session asks.
  answers        jsonb not null check (jsonb_typeof(answers) = 'object'),
  guide          jsonb not null check (jsonb_typeof(guide) = 'object'),
  created_at     timestamptz not null default now()
);

create index personal_friction_guides_user_team_idx on public.personal_friction_guides(user_id, team_id, created_at desc);

alter table public.personal_friction_guides enable row level security;

create policy "Owners read their own friction guides" on public.personal_friction_guides
  for select using (auth.uid() = user_id);

create policy "Owners create their own friction guides" on public.personal_friction_guides
  for insert with check (auth.uid() = user_id and public.is_team_member(team_id));

create policy "Owners delete their own friction guides" on public.personal_friction_guides
  for delete using (auth.uid() = user_id);

comment on table public.personal_friction_guides is
  'Tier 2 — private, individual-owned. A person''s own situation, point of '
  'view, and the discussion guide built from them. Owner-only RLS, same '
  'hard rule as private_reflections (spec §9, §14): no facilitator, org '
  'admin, or manager policy ever, regardless of role or how the request is '
  'framed. Written only through the prepare-friction-guide edge function, '
  'which inserts with the caller''s own JWT (never the service role). The '
  'grounding answers that come before this (tier 0) are never stored '
  'anywhere; this table holds only what the person chose to write for the '
  'guide. That the session happened is counted separately by '
  'friction_grounding_completions, so nothing here feeds team reporting.';

-- ============================================================
-- Team setting: team or individual cohort?
-- ============================================================
-- Default 'team': existing groups keep today's behavior and wording.
alter table public.teams add column team_type text not null default 'team'
  check (team_type in ('team', 'individual_cohort'));

-- teams UPDATE is limited to org admins, but a group's facilitator is who
-- should control this, so it goes through a narrow security-definer function
-- that can change this one column and nothing else (same shape as
-- set_team_reminders_enabled).
create or replace function public.set_team_type(p_team_id uuid, p_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_team_facilitator(p_team_id) then
    raise exception 'Only a facilitator can change what kind of group this is';
  end if;
  if p_type not in ('team', 'individual_cohort') then
    raise exception 'Unknown group type';
  end if;
  update public.teams set team_type = p_type where id = p_team_id;
end;
$$;

-- Enforced here rather than only hidden in the UI. Same rule as before (the
-- session's initiator or the team's facilitator may add participants), plus:
-- in an individual cohort, a friction session can only ever have its
-- initiator as a participant. Vision sessions are unaffected. Sessions
-- already in flight keep the participants they have; this only governs new
-- rows.
create or replace function public.can_add_session_participant(p_session_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.convergence_sessions s
    join public.teams t on t.id = s.team_id
    where s.id = p_session_id
      and (s.initiator_id = auth.uid() or public.is_team_facilitator(s.team_id))
      and (s.session_type <> 'friction' or t.team_type = 'team' or p_user_id = s.initiator_id)
  );
$$;

drop policy "Facilitators and initiators add participants" on public.session_participants;

create policy "Facilitators and initiators add participants" on public.session_participants
  for insert with check (public.can_add_session_participant(session_id, user_id));
