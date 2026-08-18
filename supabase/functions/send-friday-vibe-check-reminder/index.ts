// Scheduled Friday-morning nudge to complete the weekly vibe check —
// triggered by pg_cron via pg_net (migration 20260818060000), not by any
// client action. No caller JWT exists for a cron-triggered request, so the
// shared CRON_SECRET header is the only gate here; this is the one
// function in this codebase that fans out to potentially every team
// member across every team, so an unauthenticated version of it would be
// a real spam-abuse surface.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendEmail, envSubjectPrefix } from '../_shared/email/resend.ts'
import { renderEmail } from '../_shared/email/template.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

// Mirrors src/lib/week.ts's getWeekStart() — edge functions can't import
// from src/, so this stays in sync by hand. Monday-anchored, UTC.
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? 'http://localhost:5173'
  const weekOf = getWeekStart()

  const { data: teams } = await db.from('teams').select('id, name')
  if (!teams?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  let sent = 0
  for (const team of teams) {
    const { data: members } = await db
      .from('team_members')
      .select('user_id, users(email, name)')
      .eq('team_id', team.id)
    if (!members?.length) continue

    const { data: alreadySubmitted } = await db
      .from('pulse_vibe_scores')
      .select('user_id')
      .eq('team_id', team.id)
      .eq('week_of', weekOf)
    const submittedIds = new Set((alreadySubmitted ?? []).map((r) => r.user_id))

    const pending = members.filter(
      (m): m is typeof m & { users: { email: string; name: string } } => !!m.users?.email && !submittedIds.has(m.user_id)
    )

    const ctaUrl = `${appBaseUrl}/teams/${team.id}/pulse`
    const results = await Promise.allSettled(
      pending.map((m) =>
        sendEmail({
          to: m.users.email,
          subject: `${envSubjectPrefix()}Quick vibe check for ${team.name}`,
          html: renderEmail({
            preheader: `A minute or two to say how this week went on ${team.name}.`,
            heading: 'How was your week?',
            bodyHtml: `<p style="margin:0;">Take a minute to share how this week went on <strong style="color:#271d17;">${team.name}</strong> — what gave you energy, what drained it, and how you're doing overall.</p>`,
            ctaLabel: 'Do the vibe check',
            ctaUrl,
          }),
        })
      )
    )
    sent += results.filter((r) => r.status === 'fulfilled').length
  }

  return new Response(JSON.stringify({ ok: true, sent, weekOf }), {
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
})
