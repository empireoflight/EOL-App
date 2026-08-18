-- IA redesign: "Do" is reframed as explicitly subordinate to Vision — every
-- experiment should visibly answer "what are we trying to learn?", not just
-- carry a title and a status.
alter table public.experiments add column hypothesis text;
