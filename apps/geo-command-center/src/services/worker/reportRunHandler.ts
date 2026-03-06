/**
 * REPORT_RUN worker handler.
 * TODO: Worker will call handleReportRun(job) when processing REPORT_RUN jobs.
 * Extracted from apps/geo-command-center/src/app/api/cron/reports/route.ts
 */

import { createServiceClient } from '@/lib/supabase/service'
import { generateReport } from '@/lib/reports/generate'
import { getEmailProvider } from '@/lib/reports/email'

export interface ReportRunPayload {
  schedule_id: string
  template_id: string
  client_id: string
  agency_id?: string // from job.agency_id when worker passes it
}

/**
 * Execute a single REPORT_RUN job.
 * Creates report_run, generates PDF, sends email to recipients.
 * TODO: Worker will call this when processing REPORT_RUN jobs.
 */
export async function handleReportRun(payload: ReportRunPayload): Promise<{ ok: boolean; runId?: string; error?: string }> {
  const supabase = createServiceClient()
  const now = new Date()

  const { data: sched, error: schedErr } = await supabase
    .from('report_schedules')
    .select('agency_id, recipients')
    .eq('id', payload.schedule_id)
    .single()
  if (schedErr || !sched) {
    return { ok: false, error: 'Schedule not found' }
  }
  const agencyId = payload.agency_id ?? sched.agency_id

  const { data: run, error: runError } = await supabase
    .from('report_runs')
    .insert({
      agency_id: agencyId,
      client_id: payload.client_id,
      template_id: payload.template_id,
      status: 'queued',
      run_at: now.toISOString(),
    })
    .select('id')
    .single()

  if (runError || !run) {
    return { ok: false, error: runError?.message ?? 'Failed to create report_run' }
  }

  const gen = await generateReport({
    runId: run.id,
    agencyId,
    clientId: payload.client_id,
    templateId: payload.template_id,
  })

  if (!gen.ok) {
    return { ok: false, runId: run.id, error: gen.error }
  }

  const recipients = (sched.recipients as { email: string }[]) ?? []
  if (recipients.length && gen.pdfPath) {
    const { data: signed } = await supabase.storage
      .from('reports')
      .createSignedUrl(gen.pdfPath, 60 * 24 * 7)

    const downloadUrl = signed?.signedUrl ?? ''
    const emailProvider = getEmailProvider()
    for (const r of recipients) {
      await emailProvider.sendReport({
        to: r.email,
        subject: `Performance Report: ${(gen.summary as { clientName?: string })?.clientName ?? 'Client'}`,
        clientName: (gen.summary as { clientName?: string })?.clientName ?? 'Client',
        downloadUrl,
        reportDate: now.toLocaleDateString(),
      })
    }
  }

  await supabase
    .from('report_runs')
    .update({ status: 'sent' })
    .eq('id', run.id)

  return { ok: true, runId: run.id }
}
