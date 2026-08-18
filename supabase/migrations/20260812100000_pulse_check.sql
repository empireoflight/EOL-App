-- ============================================================
-- EMPIRE OF LIGHT — Weekly pulse check (spec §19, replaces the old
-- weekly check-in's single mood score + free-text model)
-- ============================================================

-- Same shape as before (owner-only tier-1 raw input, one scalar 1-5 per
-- user/team/week) — just renamed to match the spec's new terminology. RLS
-- policy and table comment carry over unchanged; a rename doesn't touch them.
alter table public.checkin_mood_scores rename to pulse_vibe_scores;

-- ============================================================
-- PULSE_ENERGY_SELECTIONS — tier 1 raw input feeding tier-3 team_signals,
-- same treatment as pulse_vibe_scores and private_reflections (owner-only,
-- no role-based policy, ever).
--
-- custom_label defaults to '' rather than allowing NULL: Postgres treats
-- NULL as distinct from NULL in a unique constraint, which would silently
-- defeat de-duplication for every non-'other' category (two NULLs never
-- conflict). Using '' keeps the unique constraint meaningful for both cases.
-- ============================================================
create table if not exists public.pulse_energy_selections (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  team_id      uuid not null references public.teams(id) on delete cascade,
  week_of      date not null,
  direction    text not null check (direction in ('gave', 'drained')),
  category     text not null, -- a starter-list key, or 'other'
  custom_label text not null default '', -- only meaningful when category = 'other'
  intensity    text not null check (intensity in ('light', 'moderate', 'strong')),
  created_at   timestamptz not null default now(),
  unique (user_id, team_id, week_of, direction, category, custom_label)
);

create index if not exists pulse_energy_selections_team_week_idx on public.pulse_energy_selections(team_id, week_of);

alter table public.pulse_energy_selections enable row level security;

create policy "Owners manage their own energy selections" on public.pulse_energy_selections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table public.pulse_energy_selections is
  'Tier 1 — private, individual-owned, same hard rule as private_reflections '
  '(spec §9, §14): no org-admin/manager/facilitator policy, ever. Only '
  'service_role (aggregate-weekly-pulse Edge Function) reads across users to '
  'produce anonymized tier-3 team_signals rows, gated per-category at n>=3 '
  'distinct contributors, not just once per whole pulse check.';
