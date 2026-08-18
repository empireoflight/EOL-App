-- Documentation-only migration (spec §18 solo-mode architecture check).
-- No schema change — this records a routing decision so it isn't
-- rediscovered the hard way when a solo Evolve rollup gets built.
--
-- Verified: a team can already have exactly one member (create_team() in
-- 20260810120000_phase1_core_loop.sql inserts exactly one team_members row),
-- and the convergence session engine's readiness gate / simultaneous-reveal
-- logic already collapses correctly for a single participant — both were
-- exercised live in the Phase 2 browser verification (a "whole team"
-- friction session with one real member reached guide_ready/reveal
-- immediately). No table or RLS policy assumes >1 members anywhere in this
-- schema. §18's "a solo user is a team of one, no solo-specific tables"
-- principle already holds without any change here.
--
-- The one real divergence point: team_signals.contributor_count's
-- `check (contributor_count >= 3)` is a deliberate anti-identifiability
-- guard for genuine team aggregates and must not be loosened. Per §18,
-- solo's "tier 3 effectively collapses into tier 1" — a solo rollup has no
-- one to aggregate away from, so it must never route through team_signals
-- at all. A future solo rollup reads the user's own raw rows
-- (pulse_energy_selections, pulse_vibe_scores, private_reflections)
-- directly instead.
comment on table public.team_signals is
  'Tier 3 — team-aggregate, anonymized, n>=3 contributors enforced by the '
  'contributor_count check constraint. Written only by service_role via a '
  'server-side aggregation function that reads private_reflections/pulse_* '
  'tables — never insertable by an authenticated client. Per spec §14, this '
  'table (and any future connector writing into it) must never back an '
  'attributable, individual-level performance-review feature. Per spec §18: '
  'solo (team-of-one) rollups must NEVER route through this table — the '
  'n>=3 constraint is a real guarantee for actual teams, not a rule to work '
  'around. A solo rollup reads the user''s own tier-1 rows directly instead.';
