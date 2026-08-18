// Shared branded HTML wrapper for every transactional email. Table-based
// layout with inline styles only — email clients (Gmail especially) don't
// reliably apply <style> blocks or flexbox/grid, so this deliberately
// doesn't look like the rest of the app's React/Tailwind code.
//
// Colors are hardcoded hex, not the oklch tokens in src/styles/tokens.css —
// email clients render oklch inconsistently at best. Same conversion
// approach already used for public/favicon.svg this session.
//
// The logo is a real hosted URL (public/email-logo.png, served by the app
// itself), not a base64 data: URI — Gmail strips inline data: images from
// HTML emails as a security measure, so an embedded logo never rendered
// there even though it looked fine everywhere else.

const COLORS = {
  ink: '#2e2210',
  goldLine: '#e8c060',
  goldDot: '#f0d080',
  text: '#271d17',
  textSecondary: '#675b54',
  bg: '#faf4ec',
  surface: '#f8f0e8',
  accent: '#d49824',
  accentHover: '#6a4400',
  pinkStrong: '#743355',
  border: 'rgba(40, 25, 10, 0.12)',
}

const FONT_HEADING = "Georgia, 'Times New Roman', serif"
const FONT_BODY = "'Segoe UI', Helvetica, Arial, sans-serif"

export type RenderEmailInput = {
  /** Base URL of the sending environment (staging/prod) — used to build the hosted logo URL. */
  appBaseUrl: string
  /** Hidden inbox-preview snippet (shown next to the subject in most clients). */
  preheader: string
  heading: string
  /** Pre-built inner HTML — caller composes paragraphs/lists, this just wraps them. */
  bodyHtml: string
  ctaLabel: string
  ctaUrl: string
}

export function renderEmail({ appBaseUrl, preheader, heading, bodyHtml, ctaLabel, ctaUrl }: RenderEmailInput): string {
  const logoUrl = `${appBaseUrl}/email-logo.png`
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${COLORS.bg};font-family:${FONT_BODY};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 0 32px;text-align:center;">
                <img src="${logoUrl}" width="40" height="40" alt="Empire of Light" style="display:inline-block;border-radius:9px;" />
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 8px 32px;text-align:center;">
                <h1 style="margin:0;font-family:${FONT_HEADING};font-size:22px;font-weight:600;color:${COLORS.text};">${heading}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px 32px;font-size:14px;line-height:1.6;color:${COLORS.textSecondary};">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px 32px;text-align:center;">
                <a href="${ctaUrl}" style="display:inline-block;background:${COLORS.accent};color:${COLORS.ink};font-weight:600;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:10px;">${ctaLabel}</a>
              </td>
            </tr>
          </table>
          <div style="max-width:480px;padding:16px 8px 0 8px;text-align:center;font-size:11px;color:${COLORS.textSecondary};">
            Empire of Light
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

// Small helper for the recurring "here's a chip-style tag" pattern (friction
// type, etc.) — kept here rather than duplicated per-function.
export function renderChip(label: string): string {
  return `<span style="display:inline-block;margin-top:4px;padding:4px 10px;border-radius:999px;background:${COLORS.surface};border:1px solid ${COLORS.border};color:${COLORS.pinkStrong};font-size:11px;font-weight:600;">${label}</span>`
}
