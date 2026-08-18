-- ============================================================
-- EMPIRE OF LIGHT — Phase 2 friction flow (spec §16)
--
-- Q1-7 (tier 0 — event/somatic/emotional/cognitive/need/ownership/
-- appreciation) are never written to any table, on purpose — they exist
-- only in browser state on the client (see src/hooks/useDurableForm.ts's
-- tier-0 path). There is nothing to create for them; that IS the guarantee.
--
-- Q8-10 (tier 4 — authored, shared verbatim) get one table below, with the
-- simultaneous-reveal gate enforced as actual RLS, not application logic.
-- ============================================================

create table if not exists public.friction_session_responses (
  id              uuid primary key default uuid_generate_v4(),
  session_id      uuid not null references public.convergence_sessions(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  problem_summary text not null,
  hopes           text not null,
  what_matters    text not null,
  created_at      timestamptz not null default now(),
  unique (session_id, user_id)
);

create index if not exists friction_session_responses_session_id_idx on public.friction_session_responses(session_id);

alter table public.friction_session_responses enable row level security;

-- True only once every participant in the session has submitted (spec §16:
-- "no participant sees another's Phase 2 answers until all participants have
-- submitted" — anchoring/defensive-reactivity risk otherwise). Security
-- definer so it can read session_participants regardless of caller, same
-- pattern as is_team_member() etc.
create or replace function public.all_participants_submitted(p_session_id uuid)
returns boolean as $$
  select not exists (
    select 1 from public.session_participants
    where session_id = p_session_id and submitted_at is null
  )
  and exists (
    select 1 from public.session_participants
    where session_id = p_session_id
  );
$$ language sql security definer stable;

create policy "Authors always read their own friction response" on public.friction_session_responses
  for select using (auth.uid() = user_id);

create policy "Team members read all friction responses once everyone has submitted" on public.friction_session_responses
  for select using (
    exists (
      select 1 from public.convergence_sessions s
      where s.id = session_id and public.is_team_member(s.team_id)
    )
    and public.all_participants_submitted(session_id)
  );

create policy "Authors write their own friction response" on public.friction_session_responses
  for insert with check (auth.uid() = user_id);

create policy "Authors update their own friction response" on public.friction_session_responses
  for update using (auth.uid() = user_id);

comment on table public.friction_session_responses is
  'Tier 4 — authored knowing it will be shared, but gated by simultaneous '
  'reveal (spec §16): a row is visible to teammates only once every '
  'participant in the session has submitted, enforced by '
  'all_participants_submitted() in RLS, not application logic. Shared '
  'verbatim — never run through AI for cleanup/summarization; that '
  'reintroduces exactly the attribution and distortion risk the two-phase '
  'ephemeral-to-authored design exists to avoid.';
