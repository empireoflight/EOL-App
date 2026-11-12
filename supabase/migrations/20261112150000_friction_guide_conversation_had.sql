-- A person marks their personal discussion guide "I've had this conversation"
-- so the Unlearn page stops pinning it as a banner. The guide itself stays in
-- their history.
--
-- Owner-only, like the rest of personal_friction_guides, and limited to this
-- one column: there is still no way to edit a guide's topic, answers, or
-- steps after it is saved.
alter table public.personal_friction_guides add column conversation_had_at timestamptz;

create policy "Owners mark their own friction guides done" on public.personal_friction_guides
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke update on public.personal_friction_guides from authenticated, anon;
grant update (conversation_had_at) on public.personal_friction_guides to authenticated;
