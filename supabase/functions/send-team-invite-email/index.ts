// Sends the actual invite email once a team_invites row exists. Client
// inserts the row (RLS: facilitators/org admins only), then invokes this —
// same two-step shape as synthesis jobs (insert row, then invoke). Kept
// non-blocking on the client: the invite link still works even if this
// call fails, so a Resend outage never breaks the core invite action.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendEmail, envSubjectPrefix } from '../_shared/email/resend.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { inviteId } = await req.json()
  if (!inviteId) {
    return new Response(JSON.stringify({ error: 'inviteId is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  // Authorize with the caller's own JWT first — team_invites' RLS already
  // scopes reads to facilitators/org admins of that team, so this also
  // confirms the caller was allowed to create it in the first place.
  const authHeader = req.headers.get('Authorization') ?? ''
  const callerClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: invite, error: authError } = await callerClient
    .from('team_invites')
    .select('id, team_id, email, token, invited_by')
    .eq('id', inviteId)
    .maybeSingle()
  if (authError || !invite) {
    return new Response(JSON.stringify({ error: 'invite not found or not visible to this user' }), {
      status: 403,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  // Service role only for the cross-table name lookups below (team name,
  // inviter's name) — the invite row itself was already read as the caller.
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: team } = await db.from('teams').select('name').eq('id', invite.team_id).single()
  const { data: inviter } = await db.from('users').select('name').eq('id', invite.invited_by).single()

  const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? 'http://localhost:5173'
  const inviteUrl = `${appBaseUrl}/invite/${invite.token}`
  const teamName = team?.name ?? 'a team'
  const inviterName = inviter?.name ?? 'Someone'

  try {
    await sendEmail({
      to: invite.email,
      subject: `${envSubjectPrefix()}${inviterName} invited you to ${teamName} on Empire of Light`,
      html: `
        <p>${inviterName} invited you to join <strong>${teamName}</strong> on Empire of Light.</p>
        <p><a href="${inviteUrl}">Accept the invite</a></p>
        <p style="color:#888;font-size:12px;">${inviteUrl}</p>
      `,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'send failed' }), {
      status: 502,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
})
