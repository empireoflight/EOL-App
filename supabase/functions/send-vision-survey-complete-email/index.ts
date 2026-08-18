// Fires once for the facilitator when the last vision participant submits
// their reflection. Client only invokes this when claim_session_completion
// (migration 20260818050000) returns true for their own submission — that
// RPC's atomic insert-conflict is what guarantees this fires exactly once
// even if the last two people submit within the same second.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendEmail, envSubjectPrefix } from '../_shared/email/resend.ts'
import { renderEmail } from '../_shared/email/template.ts'

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

  const authHeader = req.headers.get('Authorization') ?? ''
  const callerClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: session, error: authError } = await callerClient
    .from('convergence_sessions')
    .select('id, team_id, initiator_id')
    .eq('id', sessionId)
    .maybeSingle()
  if (authError || !session) {
    return new Response(JSON.stringify({ error: 'session not found or not visible to this user' }), {
      status: 403,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: team } = await db.from('teams').select('name').eq('id', session.team_id).single()
  const { data: facilitator } = await db.from('users').select('email').eq('id', session.initiator_id).single()

  if (!facilitator?.email) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? 'http://localhost:5173'
  const ctaUrl = `${appBaseUrl}/teams/${session.team_id}/vision/sessions/${sessionId}`
  const teamName = team?.name ?? 'Your team'

  await sendEmail({
    to: facilitator.email,
    subject: `${envSubjectPrefix()}Everyone's answered — ${teamName}'s vision guide is ready to generate`,
    html: renderEmail({
      appBaseUrl,
      preheader: `Everyone on ${teamName} has submitted their vision reflection.`,
      heading: "Everyone's answered",
      bodyHtml: `<p style="margin:0;">Every participant on ${teamName} has submitted their reflection. You can generate the synthesis guide whenever you're ready.</p>`,
      ctaLabel: 'View session',
      ctaUrl,
    }),
  })

  return new Response(JSON.stringify({ ok: true, sent: 1 }), {
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
})
