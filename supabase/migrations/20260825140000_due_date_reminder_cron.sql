-- Scheduled daily due-date reminder for experiments/actions — same
-- pg_cron + pg_net + Vault pattern as
-- 20260818060000_friday_vibe_check_reminder_cron.sql (see that file's
-- comment for why Vault instead of hardcoded secrets/URLs). Reuses the
-- same 'edge_base_url' and 'cron_secret' Vault secrets already populated
-- per-environment for the Friday job.
--
-- 13:00 UTC daily, same hour as the existing Friday job for consistency.

select cron.schedule(
  'due-date-reminder',
  '0 13 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'edge_base_url') || '/send-due-date-reminder',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
