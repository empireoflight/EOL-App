// Fires when a facilitator sends a vision for approval (send_vision_for_approval
// RPC). Client invokes this right after that RPC succeeds — see
// src/hooks/useVision.ts's useSendVisionForApproval.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendEmail, envSubjectPrefix } from '../_shared/email/resend.ts'
import { renderEmail } from '../_shared/email/template.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { visionId } = await req.json()
  if (!visionId) {
    return new Response(JSON.stringify({ error: 'visionId is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  // Authorize with the caller's own JWT first — "Team members read team
  // visions" RLS confirms they're actually on this team.
  const authHeader = req.headers.get('Authorization') ?? ''
  const callerClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: vision, error: authError } = await callerClient
    .from('visions')
    .select('id, team_id')
    .eq('id', visionId)
    .maybeSingle()
  if (authError || !vision) {
    return new Response(JSON.stringify({ error: 'vision not found or not visible to this user' }), {
      status: 403,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: team } = await db.from('teams').select('name').eq('id', vision.team_id).single()
  const { data: members } = await db
    .from('team_members')
    .select('user_id, users(email, name)')
    .eq('team_id', vision.team_id)

  const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? 'http://localhost:5173'
  const ctaUrl = `${appBaseUrl}/teams/${vision.team_id}/vision/commit`
  const teamName = team?.name ?? 'your team'

  const recipients = (members ?? []).filter((m) => m.users?.email) as { user_id: string; users: { email: string; name: string } }[]

  await Promise.allSettled(
    recipients.map((m) =>
      sendEmail({
        to: m.users.email,
        subject: `${envSubjectPrefix()}${teamName}'s vision is ready for commitment`,
        html: renderEmail({
          appBaseUrl,
          preheader: `${teamName}'s vision is ready for everyone to commit to.`,
          heading: `${teamName}'s vision is ready for commitment`,
          bodyHtml: `<p style="margin:0;">Someone on your team sent the vision for approval. Once everyone commits, it becomes the shared reference point for tasks, check-ins, and the cycle ahead.</p>`,
          ctaLabel: 'Review and commit',
          ctaUrl,
        }),
      })
    )
  )

  return new Response(JSON.stringify({ ok: true, sent: recipients.length }), {
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
})
