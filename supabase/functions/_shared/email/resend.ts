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

// Resend's default limit is ~2 requests/second per account; anything over it
// comes back as a 429 and the email is simply not sent. Scheduled functions
// that fan out to many recipients hit this easily (a person on many teams gets
// one email per team, sent back to back), so every send here retries a 429
// after the wait Resend asks for (or a short backoff) instead of dropping it.
const MAX_RATE_LIMIT_RETRIES = 4
const BATCH_SIZE = 100
const SINGLE_SEND_SPACING_MS = 600

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function resendPost(path: string, payload: unknown): Promise<Response> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set in this Edge Function environment')
  }

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${RESEND_API_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    if (res.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) return res

    const retryAfterSeconds = Number(res.headers.get('retry-after'))
    const waitMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 600 * (attempt + 1)
    await sleep(waitMs + Math.random() * 250)
  }
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  const res = await resendPost('', { from: FROM_ADDRESS, to, subject, html })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend API error (${res.status}): ${body}`)
  }
}

export type BatchResult = { sent: number; failed: { to: string; error: string }[] }

// For fan-outs: up to 100 emails per request, so a whole run is a handful of
// requests instead of one per recipient. If a batch is rejected outright (one
// invalid address can fail the whole request), that chunk falls back to
// one-at-a-time, spaced under the rate limit, so a single bad address can't
// cost everyone else their email. Failures are returned, never thrown, so the
// caller can log them.
export async function sendEmailBatch(emails: SendEmailInput[]): Promise<BatchResult> {
  const result: BatchResult = { sent: 0, failed: [] }

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const chunk = emails.slice(i, i + BATCH_SIZE)
    const res = await resendPost('/batch', chunk.map((e) => ({ from: FROM_ADDRESS, ...e })))
    if (res.ok) {
      result.sent += chunk.length
      continue
    }

    console.error(`Resend batch rejected (${res.status}), falling back to individual sends: ${await res.text()}`)
    for (const email of chunk) {
      try {
        await sendEmail(email)
        result.sent += 1
      } catch (err) {
        result.failed.push({ to: email.to, error: err instanceof Error ? err.message : String(err) })
      }
      await sleep(SINGLE_SEND_SPACING_MS)
    }
  }

  return result
}

// Non-production environments (staging) prefix the subject so a test email
// is never mistakable for a real one — set via the APP_ENV secret, defaults
// to treating unset/anything-but-'production' as non-prod (fail safe).
export function envSubjectPrefix(): string {
  return Deno.env.get('APP_ENV') === 'production' ? '' : '[Staging] '
}
