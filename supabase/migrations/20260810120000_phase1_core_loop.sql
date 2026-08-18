-- ============================================================
-- EMPIRE OF LIGHT — Phase 1 core loop
-- team invites, convergence session engine (spec §16), vision (spec §5),
-- experiments, weekly check-in tier-1 pipeline, notifications.
-- ============================================================

-- ============================================================
-- TEAM_INVITES
-- ============================================================
create table if not exists public.team_invites (
  id           uuid primary key default uuid_generate_v4(),
  team_id      uuid not null references public.teams(id) on delete cascade,
  email        text not null,
  invited_by   uuid not null references auth.users(id),
  token        uuid not null default uuid_generate_v4() unique,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz
);

create index if not exists team_invites_team_id_idx on public.team_invites(team_id);

alter table public.team_invites enable row level security;

create policy "Facilitators and org admins read team invites" on public.team_invites
  for select using (
    public.is_team_facilitator(team_id)
    or exists (select 1 from public.teams t where t.id = team_id and public.is_org_admin(t.org_id))
  );

create policy "Facilitators and org admins create team invites" on public.team_invites
  for insert with check (
    public.is_team_facilitator(team_id)
    or exists (select 1 from public.teams t where t.id = team_id and public.is_org_admin(t.org_id))
  );

create policy "Facilitators and org admins update team invites" on public.team_invites
  for update using (
    public.is_team_facilitator(team_id)
    or exists (select 1 from public.teams t where t.id = team_id and public.is_org_admin(t.org_id))
  );

-- Token-based lookup for the unauthenticated invite-landing page goes through
-- a security-definer function (below), NOT a broad RLS select policy — an
-- RLS policy has no way to scope itself to "only the row matching the token
-- the client queried for," so a `using (true)` policy here would let anyone
-- enumerate every invite (and email address) across every team. The function
-- returns at most the one row whose token was supplied; the token itself
-- (a random UUID) is the capability, same trust model as a password-reset link.
create or replace function public.get_team_invite(p_token uuid)
returns table (
  id uuid, team_id uuid, team_name text, email text, status text, created_at timestamptz
) as $$
  select i.id, i.team_id, t.name as team_name, i.email, i.status, i.created_at
  from public.team_invites i
  join public.teams t on t.id = i.team_id
  where i.token = p_token and i.status = 'pending';
$$ language sql security definer stable;

-- ============================================================
-- CONVERGENCE_SESSIONS  (spec §16 — vision and friction both run on this)
-- ============================================================
create table if not exists public.convergence_sessions (
  id               uuid primary key default uuid_generate_v4(),
  team_id          uuid not null references public.teams(id) on delete cascade,
  session_type     text not null check (session_type in ('vision', 'friction')),
  status           text not null default 'draft' check (status in (
    'draft', 'collecting', 'ready', 'synthesizing', 'guide_ready', 'scheduled', 'discussed', 'closed'
  )),
  initiator_id     uuid not null references auth.users(id),
  framing          jsonb not null default '{}'::jsonb,
  readiness_gate   jsonb not null default '{"type": "all"}'::jsonb,
  meeting_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists convergence_sessions_team_id_idx on public.convergence_sessions(team_id);

alter table public.convergence_sessions enable row level security;

create policy "Team members read team sessions" on public.convergence_sessions
  for select using (public.is_team_member(team_id));

create policy "Team members create sessions" on public.convergence_sessions
  for insert with check (public.is_team_member(team_id) and initiator_id = auth.uid());

create policy "Facilitators and initiators update sessions" on public.convergence_sessions
  for update using (
    initiator_id = auth.uid() or public.is_team_facilitator(team_id)
  );

create trigger convergence_sessions_set_updated_at
  before update on public.convergence_sessions
  for each row execute function public.set_updated_at();

-- private_reflections gets a session_id column so vision-session answers
-- (kind='vision_answer') can be scoped to one session rather than filtered
-- by content shape. Nullable — most tier-1 content (e.g. checkin_text) isn't
-- tied to a convergence session at all. RLS is unaffected: still owner-only.
alter table public.private_reflections
  add column if not exists session_id uuid references public.convergence_sessions(id) on delete set null;

create index if not exists private_reflections_session_id_idx on public.private_reflections(session_id);

-- ============================================================
-- SESSION_PARTICIPANTS
-- ============================================================
create table if not exists public.session_participants (
  session_id    uuid not null references public.convergence_sessions(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  submitted_at  timestamptz,
  primary key (session_id, user_id)
);

alter table public.session_participants enable row level security;

create policy "Team members read session participants" on public.session_participants
  for select using (
    exists (
      select 1 from public.convergence_sessions s
      where s.id = session_id and public.is_team_member(s.team_id)
    )
  );

create policy "Facilitators and initiators add participants" on public.session_participants
  for insert with check (
    exists (
      select 1 from public.convergence_sessions s
      where s.id = session_id and (s.initiator_id = auth.uid() or public.is_team_facilitator(s.team_id))
    )
  );

-- A participant flips their own row's submitted_at once they've saved their
-- reflection — no RPC indirection needed, this is the only field they can touch.
create policy "Participants update their own participation row" on public.session_participants
  for update using (auth.uid() = user_id);

-- ============================================================
-- SYNTHESIS_JOBS
--
-- Same write pattern as team_signals (Phase 0): no authenticated update
-- policy on status transitions — only service_role (the Edge Function)
-- moves queued -> running -> succeeded/failed. The client may only insert
-- the initial queued row.
-- ============================================================
create table if not exists public.synthesis_jobs (
  id            uuid primary key default uuid_generate_v4(),
  session_id    uuid not null references public.convergence_sessions(id) on delete cascade,
  status        text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  attempts      int not null default 0,
  error         text,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists synthesis_jobs_session_id_idx on public.synthesis_jobs(session_id);

alter table public.synthesis_jobs enable row level security;

create policy "Team members read synthesis jobs" on public.synthesis_jobs
  for select using (
    exists (
      select 1 from public.convergence_sessions s
      where s.id = session_id and public.is_team_member(s.team_id)
    )
  );

create policy "Facilitators and initiators queue synthesis jobs" on public.synthesis_jobs
  for insert with check (
    exists (
      select 1 from public.convergence_sessions s
      where s.id = session_id and (s.initiator_id = auth.uid() or public.is_team_facilitator(s.team_id))
    )
  );

-- ============================================================
-- VISIONS  — tier 4, portable {nodes, edges} JSON (spec §5)
-- ============================================================
create table if not exists public.visions (
  id            uuid primary key default uuid_generate_v4(),
  team_id       uuid not null references public.teams(id) on delete cascade,
  session_id    uuid references public.convergence_sessions(id) on delete set null,
  layout        jsonb not null default '{"nodes": [], "edges": []}'::jsonb,
  alignment_guide jsonb,
  status        text not null default 'draft' check (status in ('draft', 'committed')),
  created_by    uuid not null references auth.users(id),
  created_at    timestamptz not null default now(),
  committed_at  timestamptz
);

create index if not exists visions_team_id_idx on public.visions(team_id);

alter table public.visions enable row level security;

create policy "Team members read team visions" on public.visions
  for select using (public.is_team_member(team_id));

create policy "Facilitators and initiators create visions" on public.visions
  for insert with check (public.is_team_member(team_id));

create policy "Team members co-edit a draft vision" on public.visions
  for update using (public.is_team_member(team_id) and status = 'draft');

-- ============================================================
-- VISION_COMMITMENTS
-- ============================================================
create table if not exists public.vision_commitments (
  vision_id     uuid not null references public.visions(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  status        text not null default 'waiting' check (status in ('committed', 'waiting')),
  note          text,
  committed_at  timestamptz,
  primary key (vision_id, user_id)
);

alter table public.vision_commitments enable row level security;

create policy "Team members read vision commitments" on public.vision_commitments
  for select using (
    exists (
      select 1 from public.visions v
      where v.id = vision_id and public.is_team_member(v.team_id)
    )
  );

create policy "Users write their own commitment" on public.vision_commitments
  for insert with check (auth.uid() = user_id);

create policy "Users update their own commitment" on public.vision_commitments
  for update using (auth.uid() = user_id);

-- ============================================================
-- EXPERIMENTS  — tier 4
-- ============================================================
create table if not exists public.experiments (
  id             uuid primary key default uuid_generate_v4(),
  team_id        uuid not null references public.teams(id) on delete cascade,
  vision_id      uuid references public.visions(id) on delete set null,
  pillar_node_id text,
  title          text not null,
  assignee_id    uuid references auth.users(id),
  status         text not null default 'not_started' check (status in ('not_started', 'in_progress', 'done')),
  due_date       date,
  cycle_start    date,
  cycle_end      date,
  created_by     uuid not null references auth.users(id),
  created_at     timestamptz not null default now()
);

create index if not exists experiments_team_id_idx on public.experiments(team_id);

alter table public.experiments enable row level security;

create policy "Team members read team experiments" on public.experiments
  for select using (public.is_team_member(team_id));

create policy "Team members manage team experiments" on public.experiments
  for all using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

-- ============================================================
-- CHECKIN_MOOD_SCORES  — tier 1 raw input feeding tier-3 team_signals
-- ============================================================
create table if not exists public.checkin_mood_scores (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  team_id     uuid not null references public.teams(id) on delete cascade,
  week_of     date not null,
  score       int not null check (score between 1 and 5),
  created_at  timestamptz not null default now(),
  unique (user_id, team_id, week_of)
);

alter table public.checkin_mood_scores enable row level security;

create policy "Owners manage their own mood scores" on public.checkin_mood_scores
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table public.checkin_mood_scores is
  'Tier 1 — private, individual-owned, same hard rule as private_reflections '
  '(spec §9, §14): no org-admin/manager/facilitator policy, ever. Only '
  'service_role (aggregate-weekly-checkin Edge Function) reads across users '
  'to produce anonymized tier-3 team_signals rows once n>=3.';

-- ============================================================
-- NOTIFICATIONS  — in-app only (email is deferred, see README)
-- ============================================================
create table if not exists public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  team_id     uuid references public.teams(id) on delete cascade,
  kind        text not null,
  session_id  uuid references public.convergence_sessions(id) on delete cascade,
  message     text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);

alter table public.notifications enable row level security;

create policy "Owners manage their own notifications" on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- BOOTSTRAP / INVITE-ACCEPT RPCs
--
-- create_organization fixes a real gap in the Phase 0 RLS: a brand-new org
-- has zero org_members rows, so is_org_admin() is false for everyone and no
-- one could otherwise insert the first membership row (the policy that
-- grants org-admin insert rights on org_members is circular for org #1's
-- first admin). These three functions are security definer specifically to
-- cross that one bootstrap gap safely — each does exactly one well-scoped
-- thing tied to auth.uid(), not a general RLS bypass.
-- ============================================================
create or replace function public.create_organization(p_name text)
returns public.organizations as $$
declare
  new_org public.organizations;
begin
  insert into public.organizations (name) values (p_name) returning * into new_org;
  insert into public.org_members (org_id, user_id, org_role) values (new_org.id, auth.uid(), 'admin');
  return new_org;
end;
$$ language plpgsql security definer;

create or replace function public.create_team(p_org_id uuid, p_name text)
returns public.teams as $$
declare
  new_team public.teams;
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'not a member of this organization';
  end if;
  insert into public.teams (org_id, name) values (p_org_id, p_name) returning * into new_team;
  insert into public.team_members (team_id, user_id, team_role) values (new_team.id, auth.uid(), 'facilitator');
  return new_team;
end;
$$ language plpgsql security definer;

-- Accepting an invite is the only path onto a team as a non-facilitator: it
-- validates the invite is pending, requires the caller's email to match the
-- invited address (so a leaked token can't be used by a different account),
-- inserts the membership, and marks the invite accepted — atomically, so
-- there's no window where the invite is consumed but membership failed.
create or replace function public.accept_team_invite(p_token uuid)
returns public.team_members as $$
declare
  invite public.team_invites;
  caller_email text;
  new_membership public.team_members;
begin
  select * into invite from public.team_invites where token = p_token and status = 'pending';
  if invite is null then
    raise exception 'invite not found or already used';
  end if;

  select email into caller_email from public.users where id = auth.uid();
  if caller_email is null or caller_email <> invite.email then
    raise exception 'this invite was sent to a different email address';
  end if;

  insert into public.team_members (team_id, user_id, team_role)
  values (invite.team_id, auth.uid(), 'member')
  on conflict (team_id, user_id) do nothing
  returning * into new_membership;

  update public.team_invites set status = 'accepted', accepted_at = now() where id = invite.id;

  return new_membership;
end;
$$ language plpgsql security definer;
