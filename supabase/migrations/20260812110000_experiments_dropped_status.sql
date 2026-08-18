-- Weekly pulse check's task review step (spec §19) asks which committed
-- items "completed, carried over, or dropped" — experiments.status had no
-- way to represent "dropped" until now.
alter table public.experiments drop constraint experiments_status_check;
alter table public.experiments add constraint experiments_status_check
  check (status in ('not_started', 'in_progress', 'done', 'dropped'));
