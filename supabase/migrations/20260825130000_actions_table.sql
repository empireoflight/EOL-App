-- "Actions" — a lighter to-do alongside experiments in the Do section.
-- Same lifecycle (not_started/in_progress/done/dropped) and the same
-- completed_at-on-done semantics so they can carry over into the weekly
-- pulse review and the rollup's "tasks completed" count exactly like
-- experiments do, but without a pillar link or a hypothesis/learning
-- writeup — those are what make an experiment an experiment.
create table public.actions (
  id                uuid primary key default uuid_generate_v4(),
  team_id           uuid not null references public.teams(id) on delete cascade,
  vision_id         uuid references public.visions(id) on delete set null,
  title             text not null,
  assignee_id       uuid references auth.users(id),
  status            text not null default 'not_started' check (status in ('not_started', 'in_progress', 'done', 'dropped')),
  due_date          date,
  completed_at      timestamptz,
  reminder_sent_at  timestamptz,
  created_by        uuid not null references auth.users(id),
  created_at        timestamptz not null default now()
);

create index on public.actions(team_id);

alter table public.actions enable row level security;

create policy "Team members read team actions" on public.actions
  for select using (public.is_team_member(team_id));

create policy "Team members manage team actions" on public.actions
  for all using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

-- Reuses experiments' completed_at trigger function unchanged (from
-- 20260819090000_experiments_completed_at.sql) — it only ever reads
-- NEW/OLD row fields, no table-specific logic, so it works as-is here.
create trigger actions_set_completed_at
  before update on public.actions
  for each row execute function public.set_experiment_completed_at();

-- Dedup guard for the due-date reminder cron (20260825140000) — added to
-- experiments too since the same reminder job covers both tables.
alter table public.experiments add column reminder_sent_at timestamptz;
