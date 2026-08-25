// Reads tier-2 pulse_energy_notes (free text) + tier-3 pulse_vibe_scores for
// one team+week, enforces n>=3 distinct contributors PER DIRECTION
// independently (same precedent the category system this replaces already
// established — a single direction could be identifiable even when the
// whole pulse check has plenty of participants), and writes tier-3
// team_signals rows: one vibe_avg row plus one weekly_narrative row holding
// the AI-synthesized pattern/themes/insights. Triggered manually by a
// facilitator for v1.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { synthesizeRollup } from '../_shared/ai/provider.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MIN_CONTRIBUTORS = 3
const PRIOR_WEEKS_FOR_TREND = 3

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { teamId, weekOf } = await req.json()
  if (!teamId || !weekOf) {
    return new Response(JSON.stringify({ error: 'teamId and weekOf are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  // Authorize with the caller's own JWT before doing privileged work.
  const authHeader = req.headers.get('Authorization') ?? ''
  const callerClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: team, error: authError } = await callerClient.from('teams').select('id, name').eq('id', teamId).maybeSingle()
  if (authError || !team) {
    return new Response(JSON.stringify({ error: 'team not found or not visible to this user' }), {
      status: 403,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: vibeScores } = await db
    .from('pulse_vibe_scores')
    .select('user_id, score')
    .eq('team_id', teamId)
    .eq('week_of', weekOf)

  const vibeContributorCount = new Set((vibeScores ?? []).map((v) => v.user_id)).size

  const { data: notes } = await db
    .from('pulse_energy_notes')
    .select('user_id, direction, text')
    .eq('team_id', teamId)
    .eq('week_of', weekOf)

  // Gate per-direction, independently — the n>=3 rule applies to "what gave
  // energy" and "what drained energy" separately, not once for the whole
  // check-in, same anti-identification precedent the category system used.
  const byDirection = { gave: new Map<string, string>(), drained: new Map<string, string>() }
  for (const n of notes ?? []) {
    if (n.direction === 'gave' || n.direction === 'drained') byDirection[n.direction].set(n.user_id, n.text)
  }
  const gaveQualifies = byDirection.gave.size >= MIN_CONTRIBUTORS
  const drainedQualifies = byDirection.drained.size >= MIN_CONTRIBUTORS

  if (!gaveQualifies && !drainedQualifies && vibeContributorCount < MIN_CONTRIBUTORS) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'not_enough_contributors', vibeContributorCount, required: MIN_CONTRIBUTORS }),
      { headers: { ...corsHeaders, 'content-type': 'application/json' } }
    )
  }

  const avgVibe = vibeContributorCount >= MIN_CONTRIBUTORS
    ? (vibeScores ?? []).reduce((sum, v) => sum + v.score, 0) / (vibeScores?.length ?? 1)
    : null

  // Score counts (1-5), not who picked what — same aggregate-only guarantee
  // as the average itself, gated by the same n>=3 check before this block
  // even runs.
  const vibeDistribution =
    vibeContributorCount >= MIN_CONTRIBUTORS
      ? (vibeScores ?? []).reduce<Record<number, number>>((dist, v) => {
          dist[v.score] = (dist[v.score] ?? 0) + 1
          return dist
        }, {})
      : null

  const { data: vision } = await db
    .from('visions')
    .select('layout')
    .eq('team_id', teamId)
    .eq('status', 'committed')
    .order('committed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  type VisionNode = { kind: string; text: string }
  const visionNodes = (vision?.layout as { nodes?: VisionNode[] } | null)?.nodes ?? []
  const northStar = visionNodes.find((n) => n.kind === 'north_star')?.text
  const pillars = visionNodes.filter((n) => n.kind === 'pillar').map((n) => n.text)
  const visionContext = northStar ? { northStar, pillars } : undefined

  const { data: priorRows } = await db
    .from('team_signals')
    .select('value, period_start')
    .eq('team_id', teamId)
    .eq('source', 'pulse')
    .eq('signal_type', 'weekly_narrative')
    .lt('period_start', weekOf)
    .order('period_start', { ascending: false })
    .limit(PRIOR_WEEKS_FOR_TREND)

  const { data: priorVibeRows } = await db
    .from('team_signals')
    .select('value, period_start')
    .eq('team_id', teamId)
    .eq('source', 'pulse')
    .eq('signal_type', 'vibe_avg')
    .lt('period_start', weekOf)
    .order('period_start', { ascending: false })
    .limit(PRIOR_WEEKS_FOR_TREND)

  const priorPatterns = (priorRows ?? [])
    .reverse()
    .map((r) => ({ periodLabel: `Week of ${r.period_start}`, pattern: (r.value as { pattern?: string }).pattern ?? '' }))
    .filter((p) => p.pattern)

  // The model narrates a trend that's already numerically established here —
  // it never infers or invents one. Only set when there's a full run of
  // data points to compare (this week + PRIOR_WEEKS_FOR_TREND priors).
  let vibeTrend: 'declining' | 'improving' | undefined
  if (avgVibe !== null && (priorVibeRows ?? []).length === PRIOR_WEEKS_FOR_TREND) {
    const series = [...(priorVibeRows ?? [])].reverse().map((r) => (r.value as { avg: number }).avg).concat(avgVibe)
    const strictlyDecreasing = series.every((v, i) => i === 0 || v < series[i - 1])
    const strictlyIncreasing = series.every((v, i) => i === 0 || v > series[i - 1])
    if (strictlyDecreasing) vibeTrend = 'declining'
    else if (strictlyIncreasing) vibeTrend = 'improving'
  }

  const periodEnd = new Date(weekOf)
  periodEnd.setUTCDate(periodEnd.getUTCDate() + 6)
  const periodEndStr = periodEnd.toISOString().slice(0, 10)

  // Already-team-visible tier-4 facts, not private data — safe to count
  // across the whole team via service_role. Deliberately does NOT touch
  // friction_grounding_completions (the tier-0 "Ground first" completion
  // log): that table is owner-only by design, and aggregating it across
  // every member here would leak an individual-identifiable signal about
  // who did private processing and how often, exactly what team_signals'
  // n>=3 rule exists to prevent. Only real, already-shared group sessions
  // count toward the team-level number.
  const { count: completedExperimentCount } = await db
    .from('experiments')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .gte('completed_at', weekOf)
    .lte('completed_at', `${periodEndStr}T23:59:59.999Z`)

  const { count: completedActionCount } = await db
    .from('actions')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .gte('completed_at', weekOf)
    .lte('completed_at', `${periodEndStr}T23:59:59.999Z`)

  const completedTaskCount = (completedExperimentCount ?? 0) + (completedActionCount ?? 0)

  const { count: frictionProcessedCount } = await db
    .from('convergence_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('session_type', 'friction')
    .in('status', ['discussed', 'closed'])
    .gte('updated_at', weekOf)
    .lte('updated_at', `${periodEndStr}T23:59:59.999Z`)

  const rollup = await synthesizeRollup({
    teamName: team.name,
    periodLabel: `Week of ${weekOf}`,
    vibeAvg: avgVibe,
    gaveTexts: gaveQualifies ? [...byDirection.gave.values()] : [],
    drainedTexts: drainedQualifies ? [...byDirection.drained.values()] : [],
    visionContext,
    priorPatterns: vibeTrend ? priorPatterns : undefined,
    vibeTrend,
    completedTaskCount,
    frictionProcessedCount: frictionProcessedCount ?? 0,
  })

  const rows = []
  if (avgVibe !== null) {
    rows.push({
      team_id: teamId,
      source: 'pulse',
      signal_type: 'vibe_avg',
      value: { avg: avgVibe, distribution: vibeDistribution },
      contributor_count: vibeContributorCount,
      period_start: weekOf,
      period_end: periodEndStr,
    })
  }

  rows.push({
    team_id: teamId,
    source: 'pulse',
    signal_type: 'weekly_narrative',
    value: rollup,
    contributor_count: Math.max(vibeContributorCount, byDirection.gave.size, byDirection.drained.size, MIN_CONTRIBUTORS),
    period_start: weekOf,
    period_end: periodEndStr,
  })

  // Regenerating a week (more people checked in since, or the synthesis
  // logic changed) must replace that week's rows, not pile up duplicates
  // alongside them — this is the only writer of tier-3 pulse signals, so
  // it's the right place to make "generate" idempotent per team+period.
  await db.from('team_signals').delete().eq('team_id', teamId).eq('source', 'pulse').eq('period_start', weekOf)
  await db.from('team_signals').insert(rows)

  return new Response(JSON.stringify({ ok: true, vibeContributorCount, gaveQualifies, drainedQualifies }), {
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
})
