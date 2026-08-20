// Worker for synthesis_jobs (spec §16/§7). Never invoked inline with a page
// request — the client inserts a `queued` job row, then calls this function,
// then polls the row (see useSynthesisJobPolling). For vision, this is the
// only place tier-1 reflection content is read across users to produce the
// tier-4 layout/alignment guide. For friction, it only ever reads content
// that already cleared the simultaneous-reveal gate (tier-4 authored
// answers) to produce a discussion guide for the meeting.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { generateVisionLayout, generateVisionAlignmentGuide, generateFrictionDiscussionGuide } from '../_shared/ai/provider.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Backward-compat fallback only, for vision sessions created before
// VisionStartPage.tsx started always writing a resolved question list into
// framing.questions. Kept in sync with getVisionQuestions() in
// src/lib/visionQuestions.ts — edge functions can't import from src/, and
// this only ever runs for old sessions, so a duplicate here is simpler than
// a shared package for one fallback path.
function defaultVisionQuestions(horizon: string): { id: string; prompt: string; optional?: boolean }[] {
  return [
    { id: 'building', prompt: 'What are we building together?' },
    { id: 'who_for', prompt: "Who is it for, and what's different for them because it exists?" },
    { id: 'unique', prompt: 'What does it do that nothing else does?', optional: true },
    { id: 'hardest', prompt: "What's the hardest problem we haven't cracked yet?", optional: true },
    { id: 'proud', prompt: 'What would make you proud to put your name on this?' },
    { id: 'not_building', prompt: 'What are we deliberately not building, even if someone asks for it?', optional: true },
    { id: 'arrival_notice', prompt: `${horizon} from now, you walk in on an ordinary Tuesday. What's the first thing you notice?` },
    { id: 'arrival_doing', prompt: 'What are people doing differently than they do today?' },
    { id: 'arrival_feel', prompt: `What does it feel like to be on this team, ${horizon} from now?` },
    { id: 'negative_space', prompt: "What's gone that's here today? (a meeting, a tension, a way of working, a feeling)" },
    { id: 'anchors', prompt: "What matters most about how we get there — what wouldn't you trade away even for a better outcome?" },
  ]
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { jobId } = await req.json()
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'jobId is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  // Authorize with the caller's own JWT (RLS applies) before doing any
  // privileged work — confirms they can actually see this job/session.
  const authHeader = req.headers.get('Authorization') ?? ''
  const callerClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: authorizedJob, error: authError } = await callerClient
    .from('synthesis_jobs')
    .select('id, session_id')
    .eq('id', jobId)
    .maybeSingle()
  if (authError || !authorizedJob) {
    return new Response(JSON.stringify({ error: 'job not found or not visible to this user' }), {
      status: 403,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  // From here on, use service_role — this is the one place allowed to read
  // private_reflections across users and write team_signals-adjacent
  // tier-4 output (team_signals itself isn't touched here; see
  // aggregate-weekly-pulse for that).
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: job } = await db.from('synthesis_jobs').select('*').eq('id', jobId).single()
  if (!job || job.status !== 'queued') {
    return new Response(JSON.stringify({ error: `job is not queued (status: ${job?.status})` }), {
      status: 409,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  await db
    .from('synthesis_jobs')
    .update({ status: 'running', attempts: job.attempts + 1 })
    .eq('id', jobId)

  try {
    const { data: session } = await db
      .from('convergence_sessions')
      .select('*')
      .eq('id', job.session_id)
      .single()
    if (!session) throw new Error('session not found')
    if (session.session_type !== 'vision' && session.session_type !== 'friction') {
      throw new Error(`synthesis for session_type "${session.session_type}" is not implemented yet`)
    }

    const { data: team } = await db.from('teams').select('name').eq('id', session.team_id).single()

    if (session.session_type === 'vision') {
      const { data: reflections } = await db
        .from('private_reflections')
        .select('content')
        .eq('session_id', session.id)
        .eq('kind', 'vision_answer')
      const participantAnswers = (reflections ?? []).map((r) => r.content as Record<string, string>)
      if (participantAnswers.length === 0) throw new Error('no submitted reflections to synthesize')

      const horizon = (session.framing as Record<string, unknown>)?.horizon as string | undefined
      // Every session's framing carries its resolved question list since
      // VisionStartPage.tsx started writing it (default or facilitator-
      // edited, no distinction here). This fallback only ever applies to
      // sessions created before that shipped.
      const questions =
        ((session.framing as Record<string, unknown>)?.questions as { id: string; prompt: string }[] | undefined) ??
        defaultVisionQuestions(horizon ?? '12 months')

      const [layout, alignmentGuide] = await Promise.all([
        generateVisionLayout({ teamName: team?.name ?? 'This team', horizon: horizon ?? '12 months', questions, participantAnswers }),
        generateVisionAlignmentGuide({ teamName: team?.name ?? 'This team', questions, participantAnswers }),
      ])

      const { data: existingVision } = await db
        .from('visions')
        .select('id, status')
        .eq('session_id', session.id)
        .maybeSingle()

      // A committed vision is a deliberate, finished artifact — never
      // overwrite it just because a late reflection or a re-triggered job
      // came in. Revising a committed vision means starting a new session.
      if (existingVision?.status === 'committed') {
        throw new Error('this vision has already been committed — start a new vision session to revise it')
      }

      if (existingVision) {
        await db.from('visions').update({ layout, alignment_guide: alignmentGuide }).eq('id', existingVision.id)
      } else {
        await db.from('visions').insert({
          team_id: session.team_id,
          session_id: session.id,
          layout,
          alignment_guide: alignmentGuide,
          created_by: session.initiator_id,
        })
      }
    } else {
      // friction — synthesis only ever runs on content that already
      // cleared the simultaneous-reveal gate (friction_session_responses'
      // own RLS enforces this for clients; here we re-check the same
      // invariant directly since this runs as service_role and isn't
      // subject to that policy).
      const { data: participantRows } = await db.from('session_participants').select('user_id, submitted_at').eq('session_id', session.id)
      const allSubmitted = (participantRows ?? []).length > 0 && (participantRows ?? []).every((p) => p.submitted_at)
      if (!allSubmitted) throw new Error('not everyone has submitted their point of view yet')

      const { data: responses } = await db
        .from('friction_session_responses')
        .select('problem_summary, hopes, what_matters')
        .eq('session_id', session.id)
      if (!responses?.length) throw new Error('no submitted responses to synthesize')

      const topic = (session.framing as Record<string, unknown>)?.topic as string | undefined

      const discussionGuide = await generateFrictionDiscussionGuide({
        teamName: team?.name ?? 'This team',
        topic: topic ?? 'something the team wanted to talk through',
        responses,
      })

      await db.from('convergence_sessions').update({ discussion_guide: discussionGuide }).eq('id', session.id)
    }

    await db.from('convergence_sessions').update({ status: 'guide_ready' }).eq('id', session.id)

    const { data: participants } = await db
      .from('session_participants')
      .select('user_id')
      .eq('session_id', session.id)
    if (participants?.length) {
      await db.from('notifications').insert(
        participants.map((p) => ({
          user_id: p.user_id,
          team_id: session.team_id,
          kind: 'guide_ready',
          session_id: session.id,
          message:
            session.session_type === 'vision' ? "Your team's vision guide is ready." : "Your discussion guide is ready.",
        }))
      )
    }

    await db
      .from('synthesis_jobs')
      .update({ status: 'succeeded', completed_at: new Date().toISOString() })
      .eq('id', jobId)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await db
      .from('synthesis_jobs')
      .update({ status: 'failed', error: message, completed_at: new Date().toISOString() })
      .eq('id', jobId)
    // Fall back to `ready` so the facilitator can retry (spec §16: surface a
    // clear error rather than failing silently; retry is a manual re-invoke).
    await db.from('convergence_sessions').update({ status: 'ready' }).eq('id', job.session_id)

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})
