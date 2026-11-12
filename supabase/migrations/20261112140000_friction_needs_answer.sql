-- The first of the three authored friction questions used to be "How would
-- you summarize the problem for your discussion?" (problem_summary). It is now
-- "What do you desire or need in this situation? Why is that important to
-- you?", a different question, so its answer gets its own column instead of
-- being poured into one named for the old question. Responses already saved
-- keep their problem_summary untouched and the app keeps showing them under
-- the question they were actually asked.
alter table public.friction_session_responses add column needs text;
alter table public.friction_session_responses alter column problem_summary drop not null;

-- Every response answers one or the other; a row with neither would be an
-- empty first answer.
alter table public.friction_session_responses
  add constraint friction_session_responses_first_answer_check
  check (needs is not null or problem_summary is not null);
