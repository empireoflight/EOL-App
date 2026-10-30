-- Per-team switch for the scheduled reminder emails (the Friday vibe check and
-- the 2-day due-date reminder). Off = nobody on that team gets them. Emails
-- tied to a specific action (invites, "your vision is ready", friction
-- invites) are not affected.
--
-- Until now the only way to quiet a team was to push its vision back to draft,
-- which happens to stop the Friday reminder (the cron skips teams with no
-- non-draft vision) but also unlocks vision editing and changes how the
-- Overview looks — a side effect of a different feature, not a real setting.
alter table public.teams add column reminders_enabled boolean not null default true;

-- teams UPDATE is limited to org admins, but a team's facilitator is who should
-- control this — so it goes through a narrow security-definer function that
-- can change this one column and nothing else, rather than widening the
-- teams UPDATE policy.
create or replace function public.set_team_reminders_enabled(p_team_id uuid, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_team_facilitator(p_team_id) then
    raise exception 'Only a facilitator can change this team''s reminder emails';
  end if;
  update public.teams set reminders_enabled = p_enabled where id = p_team_id;
end;
$$;
