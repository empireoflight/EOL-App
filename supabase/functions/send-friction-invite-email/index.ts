// Fires when a facilitator brings other people into a friction session
// (FrictionStartPage's "Talk about it" / "Bring it to the team" paths).
// Content mirrors src/components/session/FrictionTopicSummary.tsx exactly —
// same "{name} raised something about: {topic}" framing shown in-app.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendEmail, envSubjectPrefix } from '../_shared/email/resend.ts'
import { renderEmail, renderChip } from '../_shared/email/template.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { sessionId } = await req.json()
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'sessionId is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  // Authorize with the caller's own JWT — "Participants read their friction
  // sessions" RLS confirms the caller (the initiator, who just inserted
  // themselves as a participant) can actually see this session.
  const authHeader = req.headers.get('Authorization') ?? ''
  const callerClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: session, error: authError } = await callerClient
    .from('convergence_sessions')
    .select('id, team_id, initiator_id, framing')
    .eq('id', sessionId)
    .maybeSingle()
  if (authError || !session) {
    return new Response(JSON.stringify({ error: 'session not found or not visible to this user' }), {
      status: 403,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: initiator } = await db.from('users').select('name').eq('id', session.initiator_id).single()
  const { data: participants, error: participantsError } = await db
    .from('session_participants')
    .select('user_id, users(email, name)')
    .eq('session_id', sessionId)
    .neq('user_id', session.initiator_id)
  if (participantsError) throw participantsError

  const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? 'http://localhost:5173'
  const ctaUrl = `${appBaseUrl}/teams/${session.team_id}/friction/sessions/${sessionId}/respond`
  const initiatorName = initiator?.name ?? 'Someone'
  const { topic, frictionType } = (session.framing ?? {}) as { topic?: string; frictionType?: string }

  const recipients = (participants ?? []).filter((p) => p.users?.email) as { user_id: string; users: { email: string; name: string } }[]

  const bodyHtml = `
    <p style="margin:0 0 4px 0;"><strong style="color:#271d17;">${initiatorName}</strong> raised something about:</p>
    <p style="margin:0 0 10px 0;color:#271d17;">${topic ?? 'something on their mind'}</p>
    ${frictionType ? renderChip(frictionType) : ''}
    <p style="margin:16px 0 0 0;">This starts private for each person — nothing is shared until everyone's processed it on their own.</p>
  `

  const results = await Promise.allSettled(
    recipients.map((p) =>
      sendEmail({
        to: p.users.email,
        subject: `${envSubjectPrefix()}${initiatorName} wants to talk something through with you`,
        html: renderEmail({
          appBaseUrl,
          preheader: `${initiatorName} raised something about: ${topic ?? ''}`,
          heading: `${initiatorName} wants to talk something through`,
          bodyHtml,
          ctaLabel: 'Share your point of view',
          ctaUrl,
        }),
      })
    )
  )
  const sent = results.filter((r) => r.status === 'fulfilled').length
  const errors = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map((r) => String(r.reason))

  return new Response(JSON.stringify({ ok: errors.length === 0, sent, attempted: recipients.length, errors }), {
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
})
