-- Scheduled Friday-morning vibe-check reminder. First scheduled job in
-- this codebase — pg_cron fires a query on schedule, which uses pg_net to
-- make an async HTTP call to the send-friday-vibe-check-reminder edge
-- function (that function itself enumerates teams/members and sends).
--
-- The URL and the shared secret the edge function checks are read from
-- Supabase Vault (supabase_vault, already enabled by default on hosted
-- projects) rather than hardcoded here, since this file is committed to
-- git — `alter database ... set app.settings.*` was the first attempt but
-- hosted Supabase's connection role doesn't have permission to set custom
-- database-level GUCs (42501). Each environment populates these two named
-- secrets once via `select vault.create_secret(value, name)` (not
-- committed — that call carries the real value).
--
-- 13:00 UTC every Friday = 9am Eastern (fixed UTC hour, so this reads as
-- 8am or 9am Eastern depending on daylight saving — not worth a DST-aware
-- schedule for a weekly reminder).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'friday-vibe-check-reminder',
  '0 13 * * 5',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'edge_base_url') || '/send-friday-vibe-check-reminder',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
