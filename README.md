# Empire of Light

A team collaboration tool built around the **Reimagine → Do → Unlearn →
Evolve** adaptive cycle — vision co-creation, lightweight task/experiment
tracking, and structured friction processing, with privacy tiers enforced at
the database layer and AI used only for synthesis, never surveillance.

Stack: Vite + React 19 + TypeScript + Tailwind v4 + Supabase (Postgres, Auth,
Edge Functions) + Anthropic API, following the same patterns as the
[Unlearning School](../Unlearning%20School) app where they carry over
(Supabase client setup, auth context shape, local-draft persistence).

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL/anon key
npm run dev
```

## Scripts

| Command             | What it does                                   |
| -------------------- | ----------------------------------------------- |
| `npm run dev`         | Start the Vite dev server                       |
| `npm run build`       | Typecheck + production build                    |
| `npm run lint`        | ESLint                                          |
| `npm run typecheck`   | `tsc` project build, no emit                    |
| `npm test`            | Vitest (unit tests, jsdom)                       |
| `npm run test:watch`  | Vitest in watch mode                            |
| `supabase test db`    | pgTAP RLS tests — **needs Docker**, see below   |

## Privacy tiers (read this before touching the schema)

Every piece of content in this product is classified into one of five tiers
(see the product spec, §1). The two that matter most for how the codebase is
built:

- **Tier 1/2 — private** (`private_reflections`): owner-only, enforced by RLS
  policies that check `auth.uid() = user_id` and **nothing else** — no org
  admin, manager, or facilitator role ever gets a policy on this table. This
  is a permanent architectural rule (spec §9, §14), not a default that can
  loosen later. See the `comment on table` in the Phase 0 migration.
- **Tier 3 — team aggregate** (`team_signals`): anonymized, n≥3 contributors
  (enforced by a `check` constraint, not just application logic), written
  only by `service_role` from an Edge Function — there is no RLS policy that
  lets an authenticated client write this table at all.

If a feature ever seems to need a manager/admin to read tier-1/2 data, that's
a sign the feature is wrong, not that the RLS should change.

## Local Supabase / RLS tests

This machine doesn't have Docker installed, so `supabase start` and
`supabase test db` can't run locally yet. The RLS test suite in
`supabase/tests/database/` is wired into CI (GitHub Actions runners have
Docker preinstalled), which is where it first actually executes. To run it
locally, install Docker Desktop (or OrbStack), then:

```bash
supabase start
supabase test db
```

## AI calls

All AI calls go through `supabase/functions/_shared/ai/provider.ts` (Edge
Function-only — it reads `ANTHROPIC_API_KEY` server-side and must never be
imported from `src/`). Application code never calls the Anthropic API
directly; see spec §15 for why.

## Project structure

```
src/
  components/   UI components (shared/ has cross-cutting pieces like TierBadge)
  pages/        Route-level components
  hooks/        useDurableForm, etc.
  lib/          Supabase client, React Query client, draft persistence
  context/      AuthContext
  styles/       Design tokens ported from the mockups
supabase/
  migrations/   Timestamped SQL migrations (promoted dev -> staging -> prod via CI, spec §3)
  functions/    Edge Functions (Deno)
  tests/        pgTAP RLS tests
```

## Environments (not yet provisioned)

The spec (§3) calls for three separate Supabase projects (`eol-dev`,
`eol-staging`, `eol-prod`) and a Vercel project mapped to
`staging.empireoflightcollective.com` / `app.empireoflightcollective.com`.
Deliberately not created yet — this repo is code-first; infra setup happens
together when there's a working core loop to point it at.
