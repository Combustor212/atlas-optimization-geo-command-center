/**
 * Scan Email Templates — Resend
 * Stripe/Linear-style minimal HTML emails for scan results.
 * Sends two emails per scan:
 *   1. User: their scores + "View Full Report" CTA
 *   2. Admin: lead details + scores for follow-up
 */
import { Resend } from 'resend'

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

export type ScanEmailData = {
  businessName: string
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  meoScore: number
  geoScore: number | null
  overallScore: number
  insight?: string | null
  scanResultsUrl: string
  bookingUrl: string
}

// ─── Score color helpers ──────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 75) return '#10b981' // emerald
  if (score >= 50) return '#f59e0b' // amber
  return '#ef4444' // red
}

function scoreLabel(score: number): string {
  if (score >= 75) return 'Strong'
  if (score >= 50) return 'Moderate'
  return 'Needs Work'
}

// ─── Shared HTML shell ────────────────────────────────────────────────────────

function htmlShell(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Atlas Growths</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- HEADER -->
        <tr>
          <td style="background:#0f172a;border-radius:12px 12px 0 0;padding:32px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="display:inline-block;background:#6366f1;color:#fff;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:4px 10px;border-radius:20px;">Atlas Growths</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- BODY -->
        <tr>
          <td style="background:#ffffff;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;padding:40px;">
            ${content}
          </td>
        </tr>
        <!-- FOOTER -->
        <tr>
          <td style="background:#f1f5f9;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;padding:24px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
              Atlas Growths · Local SEO &amp; AI Visibility Platform<br/>
              <a href="https://atlasgrowths.com" style="color:#6366f1;text-decoration:none;">atlasgrowths.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Score card HTML ──────────────────────────────────────────────────────────

function scoreCard(label: string, score: number, subtitle: string): string {
  const color = scoreColor(score)
  const lbl = scoreLabel(score)
  return `
    <td width="33%" style="padding:0 6px;text-align:center;">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 12px;">
        <div style="font-size:36px;font-weight:800;color:${color};line-height:1;">${score}</div>
        <div style="font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:1px;margin-top:4px;">${lbl}</div>
        <div style="font-size:13px;font-weight:600;color:#1e293b;margin-top:8px;">${label}</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${subtitle}</div>
      </div>
    </td>`
}

// ─── 1. USER EMAIL ────────────────────────────────────────────────────────────

export async function sendUserScanEmail(data: ScanEmailData): Promise<void> {
  const resend = getResend()
  if (!resend || !data.email) return

  const geoDisplay = data.geoScore ?? data.overallScore
  const insight = data.insight || 'Your business has real visibility opportunities. A strategy session will show you exactly how to outrank competitors in local and AI search.'

  const body = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;line-height:1.3;">
      Your Business Visibility Report Is Ready
    </h1>
    <p style="margin:0 0 32px;font-size:16px;color:#64748b;line-height:1.6;">
      Here's a snapshot of how <strong style="color:#0f172a;">${data.businessName}</strong> shows up across Maps, AI search, and online discovery.
    </p>

    <!-- SCORES -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        ${scoreCard('Maps Visibility', data.meoScore, 'MEO Score')}
        ${scoreCard('AI Visibility', geoDisplay, 'GEO Score')}
        ${scoreCard('Overall', data.overallScore, 'Combined Score')}
      </tr>
    </table>

    <!-- INSIGHT BOX -->
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-left:4px solid #6366f1;border-radius:8px;padding:20px 24px;margin-bottom:32px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6366f1;">AI Insight</p>
      <p style="margin:0;font-size:15px;color:#1e293b;line-height:1.7;">${insight}</p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${data.scanResultsUrl}" style="display:inline-block;background:#6366f1;color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
        View Your Full Report →
      </a>
    </div>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;" />

    <!-- URGENCY + BOOK CTA -->
    <div style="text-align:center;">
      <p style="margin:0 0 6px;font-size:13px;color:#94a3b8;">Limited strategy sessions available this week</p>
      <p style="margin:0 0 20px;font-size:16px;font-weight:700;color:#0f172a;">Ready to outrank your competitors?</p>
      <a href="${data.bookingUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">
        Book a Strategy Call
      </a>
    </div>`

  await resend.emails.send({
    from: 'Atlas Growths <reports@atlasgrowths.com>',
    to: data.email,
    subject: `Your Business Visibility Report — ${data.businessName}`,
    html: htmlShell(body),
  }).catch((e) => console.error('[Resend] user email failed', e))
}

// ─── 2. ADMIN EMAIL ───────────────────────────────────────────────────────────

export async function sendAdminScanEmail(data: ScanEmailData): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const adminTo = process.env.SCAN_ADMIN_EMAIL || 'info@atlasgrowths.com'
  const geoDisplay = data.geoScore ?? data.overallScore

  const row = (label: string, value: string | null | undefined) =>
    value
      ? `<tr><td style="padding:6px 0;font-size:13px;color:#64748b;width:130px;font-weight:600;">${label}</td><td style="padding:6px 0;font-size:13px;color:#1e293b;">${value}</td></tr>`
      : ''

  const body = `
    <div style="display:inline-block;background:#fee2e2;color:#dc2626;font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:1px;margin-bottom:20px;">New Lead</div>
    <h1 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#0f172a;">${data.businessName}</h1>
    <p style="margin:0 0 28px;font-size:14px;color:#64748b;">${[data.city, data.state, data.country].filter(Boolean).join(', ') || 'Location unknown'}</p>

    <!-- SCORES -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        ${scoreCard('Maps', data.meoScore, 'MEO')}
        ${scoreCard('AI', geoDisplay, 'GEO')}
        ${scoreCard('Overall', data.overallScore, 'Score')}
      </tr>
    </table>

    <!-- CONTACT INFO -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;">Contact Details</p>
      <table cellpadding="0" cellspacing="0">
        ${row('Email', data.email)}
        ${row('Phone', data.phone)}
        ${row('Address', data.address)}
        ${row('City', data.city)}
        ${row('Country', data.country)}
      </table>
    </div>

    <a href="${data.scanResultsUrl}" style="display:inline-block;background:#6366f1;color:#ffffff;font-size:14px;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:8px;">
      View Scan Report →
    </a>`

  await resend.emails.send({
    from: 'Atlas Growths Scanner <reports@atlasgrowths.com>',
    to: adminTo,
    subject: `New Scan Lead — ${data.businessName} (MEO ${data.meoScore} / GEO ${geoDisplay} / Overall ${data.overallScore})`,
    html: htmlShell(body),
  }).catch((e) => console.error('[Resend] admin email failed', e))
}

// ─── Combined sender (fire-and-forget both) ───────────────────────────────────

export function fireScanEmails(data: ScanEmailData): void {
  void sendUserScanEmail(data)
  void sendAdminScanEmail(data)
}
