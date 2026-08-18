-- Profile row creation moves server-side via a trigger on auth.users, so it
-- no longer depends on the client holding an active session right after
-- signUp() — which it doesn't whenever email confirmation is required (the
-- platform default on hosted projects; local dev disables it, which is why
-- this only ever surfaced once real signups landed on a hosted project).
-- Previously the client inserted its own public.users row immediately after
-- signUp(); with no session yet, that insert had no JWT to authenticate
-- with and was rejected by RLS ("new row violates row-level security
-- policy for table users"). A trigger runs inside the same transaction as
-- the auth.users insert itself, so there's no window for this race.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
