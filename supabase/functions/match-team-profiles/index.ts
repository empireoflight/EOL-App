// Ranks every other teammate by how complementary they are to the CALLER, for
// the Team page's bulletin board. Computed per viewer, on demand: cheaper than
// an n^2 pairwise job, scales with who's actually looking, and naturally
// directional (my needs vs. your offers). Results land in team_profile_matches,
// which the viewer can read but nobody can write except this function.
//
// Profile answers are authored for the whole team (tier 4), so reading them
// across users here with the service role exposes nothing new — the model just
// never sees names or emails (see matchTeamProfiles in _shared/ai/provider.ts).
//
// Idempotent: a hash of everything that fed the last computation is stored on
// every row, and an unchanged hash short-circuits before any AI call.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { matchTeamProfiles, type ProfileQuestionKind } from '../_shared/ai/provider.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// One prompt covers everyone; beyond this the newest-first cut keeps the call
// bounded. Far above any realistic pilot team today.
const MAX_OTHERS = 60

type Question = { id: string; prompt: string; kind: ProfileQuestionKind }

// Fallback only, for teams whose facilitator never customized the questions.
// Kept in sync with DEFAULT_PROFILE_QUESTIONS in src/lib/teamProfiles.ts —
// edge functions can't import from src/, and the same duplication exists for
// vision questions in process-synthesis-job.
const DEFAULT_QUESTIONS: Question[] = [
  { id: 'joy', prompt: 'What do you love doing in your free time?', kind: 'interest' },
  { id: 'fun_fact', prompt: "What's a fun fact about you?", kind: 'about' },
  { id: 'offer', prompt: "What's something you'd be happy to share or help others with?", kind: 'offer' },
  { id: 'seek', prompt: "What's something you'd love some help with, or company for?", kind: 'seek' },
  { id: 'ask_me', prompt: 'Ask me about…', kind: 'about' },
]

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } })
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { teamId } = await req.json()
  if (!teamId) return json({ error: 'teamId is required' }, 400)

  // Authorize with the caller's own JWT before doing any privileged work: RLS
  // only lets a team member see the team row.
  const authHeader = req.headers.get('Authorization') ?? ''
  const callerClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData } = await callerClient.auth.getUser()
  const viewerId = userData.user?.id
  if (!viewerId) return json({ error: 'not signed in' }, 401)
  const { data: team } = await callerClient.from('teams').select('id').eq('id', teamId).maybeSingle()
  if (!team) return json({ error: 'team not found or not visible to this user' }, 403)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: questionRow } = await db.from('team_profile_questions').select('questions').eq('team_id', teamId).maybeSingle()
  const questions = ((questionRow?.questions as Question[] | undefined) ?? DEFAULT_QUESTIONS).filter((q) => q.id && q.prompt)
  const questionIds = questions.map((q) => q.id)

  const { data: members } = await db.from('team_members').select('user_id').eq('team_id', teamId)
  const memberIds = new Set((members ?? []).map((m) => m.user_id))

  const { data: profiles } = await db.from('team_member_profiles').select('user_id, answers').eq('team_id', teamId)

  // Only answers to questions that still exist, from people still on the team,
  // so removing a question or a member can't leave stale input behind.
  const answered = (profiles ?? [])
    .filter((p) => memberIds.has(p.user_id))
    .map((p) => {
      const answers: Record<string, string> = {}
      for (const id of questionIds) {
        const value = (p.answers as Record<string, unknown>)?.[id]
        if (typeof value === 'string' && value.trim()) answers[id] = value.trim()
      }
      return { id: p.user_id as string, answers }
    })
    .filter((p) => Object.keys(p.answers).length > 0)

  const viewer = answered.find((p) => p.id === viewerId)
  const others = answered
    .filter((p) => p.id !== viewerId)
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .slice(0, MAX_OTHERS)

  if (!viewer || others.length === 0) return json({ ok: true, reason: 'nothing_to_match' })

  const inputHash = await sha256(JSON.stringify({ questions, viewer: viewer.answers, others }))

  const { data: existing } = await db
    .from('team_profile_matches')
    .select('other_id, input_hash')
    .eq('team_id', teamId)
    .eq('viewer_id', viewerId)

  const cacheValid = (existing ?? []).length === others.length && (existing ?? []).every((r) => r.input_hash === inputHash)
  if (cacheValid) {
    // Bump computed_at so the client's "is this older than the newest
    // profile edit?" staleness check settles instead of re-invoking forever.
    await db.from('team_profile_matches').update({ computed_at: new Date().toISOString() }).eq('team_id', teamId).eq('viewer_id', viewerId)
    return json({ ok: true, cached: true })
  }

  const matches = await matchTeamProfiles({ questions, viewer: viewer.answers, others })

  // Upsert (not delete-then-insert) so two overlapping invokes for the same
  // viewer can't collide on the primary key; then drop anyone no longer in
  // the set.
  const now = new Date().toISOString()
  const { error: upsertError } = await db.from('team_profile_matches').upsert(
    matches.map((m) => ({
      team_id: teamId,
      viewer_id: viewerId,
      other_id: m.id,
      score: m.score,
      reason: m.reason,
      input_hash: inputHash,
      computed_at: now,
    })),
    { onConflict: 'team_id,viewer_id,other_id' }
  )
  if (upsertError) return json({ error: upsertError.message }, 500)

  const keep = others.map((o) => o.id)
  await db.from('team_profile_matches').delete().eq('team_id', teamId).eq('viewer_id', viewerId).not('other_id', 'in', `(${keep.join(',')})`)

  return json({ ok: true, cached: false, matched: matches.length })
})
