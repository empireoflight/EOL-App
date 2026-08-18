// Shared branded HTML wrapper for every transactional email. Table-based
// layout with inline styles only — email clients (Gmail especially) don't
// reliably apply <style> blocks or flexbox/grid, so this deliberately
// doesn't look like the rest of the app's React/Tailwind code.
//
// Colors are hardcoded hex, not the oklch tokens in src/styles/tokens.css —
// email clients render oklch inconsistently at best. Same conversion
// approach already used for public/favicon.svg this session.

const LOGO_DATA_URI =
  'data:image/png;base64,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'

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
  /** Hidden inbox-preview snippet (shown next to the subject in most clients). */
  preheader: string
  heading: string
  /** Pre-built inner HTML — caller composes paragraphs/lists, this just wraps them. */
  bodyHtml: string
  ctaLabel: string
  ctaUrl: string
}

export function renderEmail({ preheader, heading, bodyHtml, ctaLabel, ctaUrl }: RenderEmailInput): string {
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
                <img src="${LOGO_DATA_URI}" width="40" height="40" alt="Empire of Light" style="display:inline-block;border-radius:9px;" />
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
