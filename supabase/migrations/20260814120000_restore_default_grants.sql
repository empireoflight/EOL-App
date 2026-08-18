-- Corrective migration: this local instance's `public` schema is missing the
-- standard Supabase default table/sequence/function grants for anon,
-- authenticated, and service_role (confirmed via information_schema on
-- tables untouched by any app migration, e.g. `visions` — not something any
-- migration in this repo caused). Every RLS policy in this schema assumes
-- the layered model of "grant DML broadly, RLS restricts precisely" — with
-- the base grants missing, Postgres denies at the privilege layer before
-- RLS is ever evaluated, which is why `supabase test db` started failing
-- with "permission denied" across every table, not just new ones.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
