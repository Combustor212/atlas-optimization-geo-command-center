/**
 * Email provider interface for sending scheduled reports.
 * Default implementation logs only - no external service required.
 */

export interface SendReportEmailParams {
  to: string
  subject: string
  clientName: string
  downloadUrl: string
  reportDate: string
}

export interface EmailProvider {
  sendReport(params: SendReportEmailParams): Promise<{ ok: boolean; error?: string }>
}

/** Log-only provider - writes to console, does not send emails. */
export const logOnlyEmailProvider: EmailProvider = {
  async sendReport(params: SendReportEmailParams): Promise<{ ok: boolean; error?: string }> {
    console.log('[Report Email] Would send:', {
      to: params.to,
      subject: params.subject,
      clientName: params.clientName,
      downloadUrl: params.downloadUrl,
      reportDate: params.reportDate,
    })
    return { ok: true }
  },
}

let provider: EmailProvider = logOnlyEmailProvider

export function setEmailProvider(p: EmailProvider) {
  provider = p
}

export function getEmailProvider(): EmailProvider {
  return provider
}
