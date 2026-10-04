-- Team profiles: facilitator-defined "get to know you" questions, each
-- member's answers, and per-viewer "complementary" match results powering
-- the Team page's bulletin board.
--
-- Name + photo stay global on public.users; everything here is scoped to a
-- team, so a person on two teams can answer differently on each.
--
-- Answers are authored knowing the whole team will read them, so they sit at
-- tier 4 (team shared) — readable by every teammate, writable only by their
-- owner. Match results are personal to the viewer and written only by the
-- match-team-profiles edge function (service role), same chokepoint
-- philosophy as team_signals: no authenticated write policy exists at all.

-- ============================================================
-- Questions (facilitator-defined, one row per team)
-- ============================================================
-- A separate table rather than a column on teams: teams UPDATE is gated to
-- org admins, but facilitators are the ones who should edit these.
-- Absent row => the client falls back to its built-in defaults.
create table public.team_profile_questions (
  team_id     uuid primary key references public.teams(id) on delete cascade,
  questions   jsonb not null check (jsonb_typeof(questions) = 'array'),
  updated_at  timestamptz not null default now()
);

alter table public.team_profile_questions enable row level security;

create policy "Team members read profile questions" on public.team_profile_questions
  for select using (public.is_team_member(team_id));

create policy "Facilitators manage profile questions" on public.team_profile_questions
  for all using (public.is_team_facilitator(team_id))
  with check (public.is_team_facilitator(team_id));

create trigger team_profile_questions_set_updated_at
  before update on public.team_profile_questions
  for each row execute function public.set_updated_at();

-- ============================================================
-- Member answers
-- ============================================================
-- user_id references public.users (not auth.users) so PostgREST can embed
-- the author's name/avatar in one query — same reason as
-- 20260810130000_team_members_users_fk.sql. public.users.id itself cascades
-- from auth.users, so deletion behavior is unchanged.
create table public.team_member_profiles (
  team_id     uuid not null references public.teams(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  answers     jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  updated_at  timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index team_member_profiles_user_id_idx on public.team_member_profiles(user_id);

alter table public.team_member_profiles enable row level security;

create policy "Team members read teammates' profiles" on public.team_member_profiles
  for select using (public.is_team_member(team_id));

create policy "Members write their own profile" on public.team_member_profiles
  for insert with check (user_id = auth.uid() and public.is_team_member(team_id));

create policy "Members update their own profile" on public.team_member_profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_team_member(team_id));

create policy "Members delete their own profile" on public.team_member_profiles
  for delete using (user_id = auth.uid());

create trigger team_member_profiles_set_updated_at
  before update on public.team_member_profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- Per-viewer match results
-- ============================================================
create table public.team_profile_matches (
  team_id      uuid not null references public.teams(id) on delete cascade,
  viewer_id    uuid not null references auth.users(id) on delete cascade,
  other_id     uuid not null references auth.users(id) on delete cascade,
  score        int not null check (score between 0 and 100),
  reason       text not null default '',
  -- Hash of every input that fed this viewer's last computation, so the edge
  -- function can skip the AI call when nothing relevant has changed.
  input_hash   text not null,
  computed_at  timestamptz not null default now(),
  primary key (team_id, viewer_id, other_id)
);

alter table public.team_profile_matches enable row level security;

-- Deliberately no insert/update/delete policy for authenticated or anon —
-- only service_role (the edge function) can write.
create policy "Viewers read their own matches" on public.team_profile_matches
  for select using (viewer_id = auth.uid());
