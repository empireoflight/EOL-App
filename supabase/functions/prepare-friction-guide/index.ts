// Builds a personal discussion guide for one person (see
// generatePersonalDiscussionGuide in _shared/ai/provider.ts) and saves it for
// them alone. Called from the Unlearn "Prepare a conversation" flow, after the
// person has written the situation and their point of view.
//
// Privacy shape: this function never uses the service role. It checks the
// caller is on the team with their own JWT, generates the guide, and inserts
// the row through that same caller-scoped client, so personal_friction_guides'
// owner-only RLS is what decides whether the write is allowed (and nothing here
// can read anyone else's rows). If saving fails after the guide was generated,
// the guide is still returned (saved: false) so it isn't lost. Nothing the
// person wrote is ever logged.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { generatePersonalDiscussionGuide } from '../_shared/ai/provider.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generous for a few paragraphs of writing; bounds the cost of one call.
const MAX_FIELD_CHARS = 4000

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } })
}

function field(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let body: { teamId?: unknown; topic?: unknown; frictionType?: unknown; answers?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid request' }, 400)
  }

  const teamId = field(body.teamId)
  const topic = field(body.topic)
  const frictionType = field(body.frictionType) || null
  const answers = {
    problem_summary: field(body.answers?.problem_summary),
    hopes: field(body.answers?.hopes),
    what_matters: field(body.answers?.what_matters),
  }
  if (!teamId || !topic || !answers.problem_summary || !answers.hopes || !answers.what_matters) {
    return json({ error: 'teamId, topic, and all three answers are required' }, 400)
  }
  if ([topic, ...Object.values(answers)].some((text) => text.length > MAX_FIELD_CHARS)) {
    return json({ error: 'one of the answers is too long' }, 400)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const callerClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData } = await callerClient.auth.getUser()
  const userId = userData.user?.id
  if (!userId) return json({ error: 'not signed in' }, 401)

  // RLS only lets a team member see the team row.
  const { data: team } = await callerClient.from('teams').select('id').eq('id', teamId).maybeSingle()
  if (!team) return json({ error: 'team not found or not visible to this user' }, 403)

  let guide
  try {
    guide = await generatePersonalDiscussionGuide({ topic, frictionType, answers })
  } catch (err) {
    console.error(`prepare-friction-guide: generation failed (${err instanceof Error ? err.message : String(err)})`)
    return json({ error: "Couldn't build the guide right now" }, 502)
  }

  const { data: saved, error: saveError } = await callerClient
    .from('personal_friction_guides')
    .insert({ user_id: userId, team_id: teamId, topic, friction_type: frictionType, answers, guide })
    .select('id')
    .single()

  if (saveError || !saved) {
    console.error(`prepare-friction-guide: guide built but not saved (${saveError?.message ?? 'no row returned'})`)
    return json({ ok: true, saved: false, guide })
  }

  return json({ ok: true, saved: true, id: saved.id, guide })
})
