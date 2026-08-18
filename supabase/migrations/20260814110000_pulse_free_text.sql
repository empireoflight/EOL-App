-- ============================================================
-- Pulse check redesign: free text instead of a category picker. The
-- product's job is to discover what's actually happening, not pre-guess
-- the categories people's experience will fit into — and a fixed category
-- list is itself a potential identification vector ("team x week x
-- category" narrowing to one person). Replaces pulse_energy_selections.
-- ============================================================

drop policy if exists "Owners manage their own energy selections" on public.pulse_energy_selections;
drop table if exists public.pulse_energy_selections;

-- ============================================================
-- PULSE_ENERGY_NOTES — tier 2: private, individual-owned, never shown raw
-- to teammates or in any per-user drill-down, but (unlike tier-1
-- private_reflections) eligible for AI-aggregate synthesis once n>=3
-- distinct contributors for that direction have submitted this week. Same
-- owner-only RLS shape as every other pulse table — no role-based policy,
-- ever.
-- ============================================================
create table if not exists public.pulse_energy_notes (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  team_id    uuid not null references public.teams(id) on delete cascade,
  week_of    date not null,
  direction  text not null check (direction in ('gave', 'drained')),
  text       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, team_id, week_of, direction)
);

create index if not exists pulse_energy_notes_team_week_idx on public.pulse_energy_notes(team_id, week_of);

alter table public.pulse_energy_notes enable row level security;

create policy "Owners manage their own energy notes" on public.pulse_energy_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table public.pulse_energy_notes is
  'Tier 2 — private, individual-owned, same hard rule as private_reflections '
  '(spec §9, §14): no org-admin/manager/facilitator policy, ever. Only '
  'service_role (aggregate-weekly-pulse Edge Function) reads across users, '
  'and only to feed paraphrased, unattributed theme synthesis once n>=3 '
  'distinct contributors for that direction — gated independently per '
  'direction, not once for the whole pulse check. Raw text is never '
  'returned to any client, never quoted verbatim in synthesis output, and '
  'never exposed via a drill-down from a theme to who said it.';
