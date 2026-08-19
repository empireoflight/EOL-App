-- Content-free completion signal for the tier-0 "Ground first" friction flow
-- (FrictionMitigatorPage.tsx). That flow is explicitly documented and
-- copy-labeled as "never sent anywhere, never saved to any server" — this
-- table does not change that for the *content* (the topic/answers still
-- never leave the device). It exists solely so a user's own weekly
-- "friction processed" count on their Evolve page survives across
-- devices/sessions, which needs at least a bare timestamp recorded
-- somewhere durable.
--
-- General-purpose, not solo-exclusive: "Ground first" is available on any
-- team regardless of size, matching this schema's existing "no
-- solo-specific tables" stance (see 20260812090000_solo_mode_docs.sql).
create table public.friction_grounding_completions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  team_id      uuid not null references public.teams(id) on delete cascade,
  completed_at timestamptz not null default now()
);

create index friction_grounding_completions_team_completed_idx
  on public.friction_grounding_completions(team_id, completed_at);

alter table public.friction_grounding_completions enable row level security;

create policy "Owners manage their own grounding completions" on public.friction_grounding_completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table public.friction_grounding_completions is
  'Content-free completion signal for the tier-0 "Ground first" friction '
  'flow — zero text/content, ever, matching the tier-0 guarantee. '
  'Owner-only RLS, same hard rule as pulse_vibe_scores/private_reflections '
  '(spec §9, §14): no facilitator/team-visible policy, ever, under any '
  'circumstance. Exists solely so a user''s own weekly "friction processed" '
  'count on their Evolve page survives across devices/sessions.';
