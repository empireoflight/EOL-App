// Transactional email via Resend. This file runs ONLY in Edge Functions
// (Deno) — reads RESEND_API_KEY from the server-side environment, same
// pattern as _shared/ai/provider.ts reading ANTHROPIC_API_KEY. Never import
// from `src/` — bundling this into the Vite client would ship the key to
// the browser.

const RESEND_API_URL = 'https://api.resend.com/emails'

// Matches the domain actually verified in Resend (app.empireoflightcollective.com,
// not the root) — sending from an unverified domain gets hard-rejected.
const FROM_ADDRESS = 'Empire of Light <notifications@app.empireoflightcollective.com>'

export type SendEmailInput = {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set in this Edge Function environment')
  }

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend API error (${res.status}): ${body}`)
  }
}

// Non-production environments (staging) prefix the subject so a test email
// is never mistakable for a real one — set via the APP_ENV secret, defaults
// to treating unset/anything-but-'production' as non-prod (fail safe).
export function envSubjectPrefix(): string {
  return Deno.env.get('APP_ENV') === 'production' ? '' : '[Staging] '
}
