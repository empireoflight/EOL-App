-- Profile page: avatar image, editable name (existing column, no change
-- needed there), and an email-notifications on/off toggle actual sending
-- code checks before adding a recipient. No new RLS needed on public.users
-- itself — "Users update own row" (20260806190000) already covers a user
-- updating either new column on their own row.
alter table public.users add column avatar_url text;
alter table public.users add column email_notifications_enabled boolean not null default true;

-- First Storage usage in this codebase. Public bucket — avatars are already
-- visible to teammates via the users row itself (same precedent as the
-- app's other public static images), so there's nothing extra being
-- exposed by the file being publicly fetchable. Object path convention is
-- `{user_id}/avatar.<ext>`, so "only manage your own" is a plain folder
-- check rather than needing to look anything up.
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

create policy "Anyone can view avatars" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Users manage their own avatar" on storage.objects
  for all using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
