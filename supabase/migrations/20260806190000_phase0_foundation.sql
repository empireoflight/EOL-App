-- ============================================================
-- EMPIRE OF LIGHT — Phase 0 foundation
-- org/team/member hierarchy (spec §9) + privacy-tier scaffolding (spec §1-2)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS  (profile row, keyed to auth.users)
-- ============================================================
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  name        text not null,
  created_at  timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users read own row" on public.users
  for select using (auth.uid() = id);

create policy "Users update own row" on public.users
  for update using (auth.uid() = id);

create policy "Users insert own row" on public.users
  for insert with check (auth.uid() = id);

-- ============================================================
-- ORGANIZATIONS  (the paying customer company)
-- ============================================================
create table if not exists public.organizations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.org_members (
  org_id      uuid not null references public.organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  org_role    text not null default 'member' check (org_role in ('admin', 'manager', 'member')),
  joined_at   timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index if not exists org_members_user_id_idx on public.org_members(user_id);

-- ============================================================
-- TEAMS  (the actual pilot cohort)
-- ============================================================
create table if not exists public.teams (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists teams_org_id_idx on public.teams(org_id);

create table if not exists public.team_members (
  team_id     uuid not null references public.teams(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  team_role   text not null default 'member' check (team_role in ('facilitator', 'member')),
  joined_at   timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index if not exists team_members_user_id_idx on public.team_members(user_id);

-- ============================================================
-- HELPER FUNCTIONS  (security definer, same pattern as Unlearning School's is_admin())
-- ============================================================
create or replace function public.is_org_member(check_org_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.org_members
    where org_id = check_org_id and user_id = auth.uid()
  );
$$ language sql security definer stable;

create or replace function public.is_org_admin(check_org_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.org_members
    where org_id = check_org_id and user_id = auth.uid() and org_role in ('admin', 'manager')
  );
$$ language sql security definer stable;

create or replace function public.is_team_member(check_team_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.team_members
    where team_id = check_team_id and user_id = auth.uid()
  );
$$ language sql security definer stable;

create or replace function public.is_team_facilitator(check_team_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.team_members
    where team_id = check_team_id and user_id = auth.uid() and team_role = 'facilitator'
  );
$$ language sql security definer stable;

-- ============================================================
-- RLS — organizations / org_members / teams / team_members
--
-- These policies grant org-admin/manager roles read access to membership
-- rows (who's in the org/team) and to tier-3/4 tables elsewhere in the
-- schema. They must NEVER be extended to private_reflections or any other
-- tier-1/2 table — see the hard rule in §9 and the comments on
-- private_reflections below.
-- ============================================================
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

create policy "Org members read their org" on public.organizations
  for select using (public.is_org_member(id));

create policy "Authenticated users create orgs" on public.organizations
  for insert with check (auth.uid() is not null);

create policy "Org admins update their org" on public.organizations
  for update using (public.is_org_admin(id));

create policy "Org members read org membership" on public.org_members
  for select using (public.is_org_member(org_id));

create policy "Org admins manage org membership" on public.org_members
  for all using (public.is_org_admin(org_id));

create policy "Users read own org membership row" on public.org_members
  for select using (auth.uid() = user_id);

create policy "Team members read their team" on public.teams
  for select using (public.is_team_member(id));

create policy "Org members create teams" on public.teams
  for insert with check (public.is_org_member(org_id));

create policy "Org admins update teams" on public.teams
  for update using (public.is_org_admin(org_id));

create policy "Team members read team membership" on public.team_members
  for select using (public.is_team_member(team_id));

create policy "Facilitators and org admins manage team membership" on public.team_members
  for all using (
    public.is_team_facilitator(team_id)
    or exists (
      select 1 from public.teams t
      where t.id = team_id and public.is_org_admin(t.org_id)
    )
  );

create policy "Users read own team membership row" on public.team_members
  for select using (auth.uid() = user_id);

-- ============================================================
-- PRIVATE_REFLECTIONS  — tier 1 (private) / tier 2 (private, AI-assisted)
--
-- HARD RULE (spec §9, §14): this table's policies check ownership
-- (auth.uid() = user_id) ONLY. No org-admin, manager, or facilitator role
-- ever gets a policy on this table, under any circumstance — that is the
-- entire psychological-safety guarantee the product is built on. If a future
-- feature (performance review, manager dashboard, ANYTHING) seems to need
-- read access here, that is a sign the feature is wrong, not that this
-- table's RLS should change.
-- ============================================================
create table if not exists public.private_reflections (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  team_id     uuid references public.teams(id) on delete set null,
  kind        text not null, -- e.g. 'vision_preaggregation', 'checkin_text', 'checkin_mood'
  content     jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists private_reflections_user_id_idx on public.private_reflections(user_id);

alter table public.private_reflections enable row level security;

create policy "Owners read their private reflections" on public.private_reflections
  for select using (auth.uid() = user_id);

create policy "Owners insert their private reflections" on public.private_reflections
  for insert with check (auth.uid() = user_id);

create policy "Owners update their private reflections" on public.private_reflections
  for update using (auth.uid() = user_id);

create policy "Owners delete their private reflections" on public.private_reflections
  for delete using (auth.uid() = user_id);

comment on table public.private_reflections is
  'Tier 1/2 — private, individual-owned. Never expose to org admins, managers, '
  'or any performance-review feature (spec §9, §14), regardless of role or '
  'how the request is framed. Only a server-side function (service_role, '
  'bypassing RLS) may read this table to produce anonymized tier-3 aggregates '
  'in team_signals — never join it directly into a team-facing view.';

-- ============================================================
-- TEAM_SIGNALS  — tier 3 (team-aggregate, anonymized)
--
-- Deliberately has NO insert/update/delete policy for `authenticated` or
-- `anon`. With RLS enabled and no matching policy, Postgres denies those
-- operations for those roles by default — only `service_role` (which
-- bypasses RLS, used by Edge Functions) can write here. This is the literal
-- DB-level chokepoint from spec §2: a client cannot write this table, full
-- stop, no matter what application code does.
-- ============================================================
create table if not exists public.team_signals (
  id                  uuid primary key default uuid_generate_v4(),
  team_id             uuid not null references public.teams(id) on delete cascade,
  source              text not null, -- 'reflection' | 'checkin' | 'manual' | future connectors (§14) — new values need no migration
  signal_type         text not null,
  value               jsonb not null,
  contributor_count   int not null check (contributor_count >= 3), -- defense-in-depth for the n>=3 rule (spec §1)
  period_start        date,
  period_end          date,
  created_at          timestamptz not null default now()
);

create index if not exists team_signals_team_id_idx on public.team_signals(team_id);

alter table public.team_signals enable row level security;

create policy "Team members read team signals" on public.team_signals
  for select using (public.is_team_member(team_id));

comment on table public.team_signals is
  'Tier 3 — team-aggregate, anonymized, n>=3 contributors enforced by the '
  'contributor_count check constraint. Written only by service_role via a '
  'server-side aggregation function that reads private_reflections — never '
  'insertable by an authenticated client. Per spec §14, this table (and any '
  'future connector writing into it) must never back an attributable, '
  'individual-level performance-review feature.';

-- ============================================================
-- FORM_DRAFTS  — tier follows the underlying form content (spec §17)
-- Server-side mirror for useDurableForm's tier 1-4 autosave.
-- ============================================================
create table if not exists public.form_drafts (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  form_key    text not null,
  payload     jsonb not null,
  updated_at  timestamptz not null default now(),
  unique (user_id, form_key)
);

alter table public.form_drafts enable row level security;

create policy "Owners manage their own form drafts" on public.form_drafts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger form_drafts_set_updated_at
  before update on public.form_drafts
  for each row execute function public.set_updated_at();
