-- Race-safe "last submitter" detection for the vision/friction "everyone's
-- done" facilitator emails. Same problem commit_to_vision (20260817120000)
-- already solved for vision commitments — a client-side read-then-write
-- lets the last two submitters both see the gate as freshly met, firing
-- the facilitator email twice. Small session groups (2-5 people, often
-- submitting live in a meeting) make this a real risk, not hypothetical.

create table public.session_completion_claims (
  session_id  uuid primary key references public.convergence_sessions(id) on delete cascade,
  claimed_by  uuid not null references auth.users(id),
  claimed_at  timestamptz not null default now()
);

alter table public.session_completion_claims enable row level security;
-- No policies — this table is only ever touched by the function below,
-- which runs as owner (security definer) and bypasses RLS. Deliberately
-- no direct client read/write access.

-- Returns true only for the one caller whose submission completed the
-- readiness gate — the insert's primary key conflict is what makes this
-- atomic: Postgres serializes concurrent inserts on the same key, so
-- exactly one racing transaction's insert succeeds.
create or replace function public.claim_session_completion(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gate jsonb;
  v_total int;
  v_submitted int;
  v_met boolean;
begin
  if not exists (
    select 1 from public.session_participants
    where session_id = p_session_id and user_id = auth.uid()
  ) then
    raise exception 'Not a participant of this session';
  end if;

  select readiness_gate into v_gate from public.convergence_sessions where id = p_session_id;

  select count(*), count(*) filter (where submitted_at is not null)
    into v_total, v_submitted
    from public.session_participants where session_id = p_session_id;

  -- Mirrors isReadinessGateMet() in src/lib/sessionStateMachine.ts — keep
  -- these two in sync if the gate model ever grows another type.
  v_met := case v_gate->>'type'
    when 'quorum' then v_total > 0 and v_submitted::float / v_total >= (v_gate->>'threshold')::float
    when 'deadline' then v_submitted > 0 and now() >= (v_gate->>'deadline')::timestamptz
    else v_total > 0 and v_submitted >= v_total -- 'all', the default for both session types today
  end;

  if not v_met then
    return false;
  end if;

  insert into public.session_completion_claims (session_id, claimed_by)
  values (p_session_id, auth.uid())
  on conflict (session_id) do nothing;

  return found;
end;
$$;
