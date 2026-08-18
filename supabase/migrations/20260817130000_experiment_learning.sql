-- "Done" should capture more than a status flip: a quick "what did we
-- learn?" note, prompted from both the Do tab and the weekly vibe check's
-- task review step.
alter table public.experiments add column learning text;
