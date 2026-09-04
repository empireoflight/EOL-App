// Scheduled daily nudge for anyone assigned an experiment or action due in
// 2 days — triggered by pg_cron via pg_net (migration
// 20260825140000_due_date_reminder_cron.sql), not by any client action.
// Same CRON_SECRET gate as send-friday-vibe-check-reminder, for the same
// reason: no caller JWT exists for a cron-triggered request.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendEmail, envSubjectPrefix } from '../_shared/email/resend.ts'
import { renderEmail } from '../_shared/email/template.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

type DueItem = {
  id: string
  team_id: string
  title: string
  due_date: string
  assignee_id: string
}

async function remindDueItems(
  db: ReturnType<typeof createClient>,
  table: 'experiments' | 'actions',
  targetDate: string,
  appBaseUrl: string,
  teamNames: Map<string, string>
): Promise<number> {
  const { data: items } = await db
    .from(table)
    .select('id, team_id, title, due_date, assignee_id')
    .eq('due_date', targetDate)
    .not('assignee_id', 'is', null)
    .is('reminder_sent_at', null)
    .not('status', 'in', '(done,dropped)')
  const dueItems = (items ?? []) as DueItem[]
  if (dueItems.length === 0) return 0

  const { data: assignees } = await db
    .from('users')
    .select('id, email, name, email_notifications_enabled')
    .in('id', dueItems.map((i) => i.assignee_id))
  const emailById = new Map((assignees ?? []).filter((u) => u.email_notifications_enabled).map((u) => [u.id, u.email as string]))

  const kindLabel = table === 'experiments' ? 'experiment' : 'action'
  const results = await Promise.allSettled(
    dueItems.map(async (item) => {
      const email = emailById.get(item.assignee_id)
      if (email) {
        const teamName = teamNames.get(item.team_id) ?? 'your team'
        await sendEmail({
          to: email,
          subject: `${envSubjectPrefix()}Reminder: "${item.title}" is due in 2 days`,
          html: renderEmail({
            appBaseUrl,
            preheader: `"${item.title}" is due ${item.due_date}.`,
            heading: 'Due in 2 days',
            bodyHtml: `<p style="margin:0;">Your ${kindLabel} <strong style="color:#271d17;">${item.title}</strong> on <strong style="color:#271d17;">${teamName}</strong> is due on ${item.due_date}.</p>`,
            ctaLabel: 'View in Empire of Light',
            ctaUrl: `${appBaseUrl}/teams/${item.team_id}/experiments`,
          }),
        })
      }
      // Stamped regardless of whether an email was actually sent (e.g. no
      // email on file) — the due_date match only ever occurs on one
      // calendar day for a given row, so there's no next-day retry either
      // way; this is purely a same-day-rerun guard.
      await db.from(table).update({ reminder_sent_at: new Date().toISOString() }).eq('id', item.id)
    })
  )
  return results.filter((r) => r.status === 'fulfilled').length
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

  const targetDate = new Date()
  targetDate.setUTCDate(targetDate.getUTCDate() + 2)
  const targetDateStr = targetDate.toISOString().slice(0, 10)

  const { data: teams } = await db.from('teams').select('id, name')
  const teamNames = new Map((teams ?? []).map((t) => [t.id, t.name as string]))

  const [experiments, actions] = await Promise.all([
    remindDueItems(db, 'experiments', targetDateStr, appBaseUrl, teamNames),
    remindDueItems(db, 'actions', targetDateStr, appBaseUrl, teamNames),
  ])

  return new Response(JSON.stringify({ ok: true, sent: { experiments, actions }, targetDate: targetDateStr }), {
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
})
