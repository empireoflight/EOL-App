-- Vision commitment lifecycle: draft -> pending_commitment -> committed,
-- with a revise path back to draft. The existing "co-edit a draft vision"
-- UPDATE policy only lets a row change while status='draft', so every
-- transition below needs a security-definer function to deliberately cross
-- that boundary — same pattern as is_team_member()/all_participants_submitted().

alter table public.visions drop constraint visions_status_check;
alter table public.visions add constraint visions_status_check
  check (status in ('draft', 'pending_commitment', 'committed'));

-- Facilitator (or the vision's own creator) sends the current draft to the
-- whole team for approval. Commitments are wiped first so a prior
-- revise-cycle's stale rows can't make the new round look already-done.
create or replace function public.send_vision_for_approval(p_vision_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_status text;
  v_created_by uuid;
begin
  select team_id, status, created_by into v_team_id, v_status, v_created_by
  from public.visions where id = p_vision_id;

  if v_team_id is null then
    raise exception 'Vision not found';
  end if;
  if not (public.is_team_facilitator(v_team_id) or v_created_by = auth.uid()) then
    raise exception 'Only a facilitator can send this vision for approval';
  end if;
  if v_status <> 'draft' then
    raise exception 'Vision is not in draft';
  end if;

  delete from public.vision_commitments where vision_id = p_vision_id;
  update public.visions set status = 'pending_commitment' where id = p_vision_id;

  insert into public.notifications (user_id, team_id, kind, message)
  select tm.user_id, v_team_id, 'vision_pending_commitment', 'A vision is ready for your review and commitment.'
  from public.team_members tm
  where tm.team_id = v_team_id;
end;
$$;

-- Records the caller's own commitment, then atomically flips the vision to
-- 'committed' once every current team member has committed — done inside
-- one function call (not a client-side read-then-write) so the last two
-- people committing at once can't both miss the flip.
create or replace function public.commit_to_vision(p_vision_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_status text;
  v_member_count int;
  v_committed_count int;
begin
  select team_id, status into v_team_id, v_status from public.visions where id = p_vision_id;

  if v_team_id is null then
    raise exception 'Vision not found';
  end if;
  if not public.is_team_member(v_team_id) then
    raise exception 'Not a team member';
  end if;
  if v_status <> 'pending_commitment' then
    raise exception 'Vision is not awaiting commitment';
  end if;

  insert into public.vision_commitments (vision_id, user_id, status, note, committed_at)
  values (p_vision_id, auth.uid(), 'committed', p_note, now())
  on conflict (vision_id, user_id) do update
    set status = 'committed', note = excluded.note, committed_at = excluded.committed_at;

  select count(*) into v_member_count from public.team_members where team_id = v_team_id;
  select count(*) into v_committed_count
    from public.vision_commitments where vision_id = p_vision_id and status = 'committed';

  if v_committed_count >= v_member_count then
    update public.visions set status = 'committed', committed_at = now() where id = p_vision_id;
  end if;
end;
$$;

-- Reopens a pending or committed vision for editing. Clears commitments so
-- the next send-for-approval round starts from zero, not stale approvals of
-- a since-edited draft.
create or replace function public.revise_vision(p_vision_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_status text;
  v_created_by uuid;
begin
  select team_id, status, created_by into v_team_id, v_status, v_created_by
  from public.visions where id = p_vision_id;

  if v_team_id is null then
    raise exception 'Vision not found';
  end if;
  if not (public.is_team_facilitator(v_team_id) or v_created_by = auth.uid()) then
    raise exception 'Only a facilitator can revise this vision';
  end if;
  if v_status not in ('pending_commitment', 'committed') then
    raise exception 'Vision is not pending or committed';
  end if;

  update public.visions set status = 'draft', committed_at = null where id = p_vision_id;
  delete from public.vision_commitments where vision_id = p_vision_id;
end;
$$;
