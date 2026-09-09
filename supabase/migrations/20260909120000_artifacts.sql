-- Shared "artifacts" (a linked doc or an uploaded file) attachable to a
-- vision or an experiment — one table, one bucket, mounted in both places
-- rather than building this twice. team_id is denormalized here (same
-- precedent as experiments/actions) so RLS never needs to join through the
-- parent, and so either parent FK cascading the row away just works.
create table public.artifacts (
  id            uuid primary key default uuid_generate_v4(),
  team_id       uuid not null references public.teams(id) on delete cascade,
  vision_id     uuid references public.visions(id) on delete cascade,
  experiment_id uuid references public.experiments(id) on delete cascade,
  kind          text not null check (kind in ('link', 'file')),
  label         text not null,
  url           text not null, -- external URL for 'link', Storage public URL for 'file'
  storage_path  text, -- only set for 'file' — needed to delete the underlying object
  created_by    uuid not null references auth.users(id),
  created_at    timestamptz not null default now(),
  constraint artifacts_one_parent check (
    (vision_id is not null and experiment_id is null) or (vision_id is null and experiment_id is not null)
  )
);

create index on public.artifacts(vision_id);
create index on public.artifacts(experiment_id);

alter table public.artifacts enable row level security;

create policy "Team members read team artifacts" on public.artifacts
  for select using (public.is_team_member(team_id));

create policy "Team members manage team artifacts" on public.artifacts
  for all using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

-- Public bucket, same tradeoff the avatars bucket already made
-- (20260904120000_user_profile_avatar.sql) — a file's URL works for anyone
-- who has it, not just team members, in exchange for not needing signed
-- URLs. Object path convention: {team_id}/{artifact_id}/{original
-- filename} — the write-side policy checks the first path segment against
-- team membership, the same shape avatars uses against a user id.
insert into storage.buckets (id, name, public) values ('artifacts', 'artifacts', true);

create policy "Anyone can view artifact files" on storage.objects
  for select using (bucket_id = 'artifacts');

create policy "Team members upload artifact files" on storage.objects
  for all using (bucket_id = 'artifacts' and public.is_team_member((storage.foldername(name))[1]::uuid))
  with check (bucket_id = 'artifacts' and public.is_team_member((storage.foldername(name))[1]::uuid));
