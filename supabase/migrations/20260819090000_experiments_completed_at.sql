-- Weekly "tasks completed" counts on the Evolve rollup need to know *when*
-- an experiment was marked done, not just that it currently is. Both
-- existing status-write call sites (ExperimentsPage.tsx, PulseCheckPage.tsx)
-- are plain `update({ status })` calls that never touch this column, so a
-- trigger is the only place that can reliably stamp it.
alter table public.experiments add column completed_at timestamptz;

create or replace function public.set_experiment_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    new.completed_at = now();
  elsif new.status is distinct from 'done' then
    -- Reopening clears it so a later re-completion gets a fresh timestamp
    -- (and doesn't keep counting toward a week it didn't actually finish in).
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger experiments_set_completed_at
  before update on public.experiments
  for each row execute function public.set_experiment_completed_at();
