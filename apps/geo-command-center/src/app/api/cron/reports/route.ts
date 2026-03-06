import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/lib/cron/auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { enqueueJob } from '@/lib/cron/enqueue'
import { getLocalParts, formatIdempotencyTime, isReportScheduleDue, getRunAtBucket } from '@/lib/cron/scheduler-utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Cron: enqueue REPORT_RUN jobs for due report_schedules.
 * Heavy work moved to services/worker/reportRunHandler.ts (worker will call it).
 */
export async function GET(req: NextRequest) {
  try {
    requireCronAuth(req)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const supabase = getSupabaseAdmin()
  const now = new Date()

  const { data: schedules, error: schedError } = await supabase
    .from('report_schedules')
    .select(`
      id,
      agency_id,
      client_id,
      template_id,
      time_of_day,
      timezone,
      frequency,
      day_of_week,
      day_of_month,
      recipients
    `)
    .eq('is_active', true)

  if (schedError || !schedules?.length) {
    return NextResponse.json({
      queued: true,
      job_type: 'REPORT_RUN',
      enqueued_count: 0,
      duplicates_skipped: 0,
      message: 'No active schedules or error',
    })
  }

  let enqueuedCount = 0
  let duplicatesSkipped = 0

  for (const sched of schedules) {
    if (!isReportScheduleDue(sched, now)) continue

    const tz = sched.timezone || 'America/New_York'
    const parts = getLocalParts(now, tz)
    const timeBucket = formatIdempotencyTime(parts)
    const idempotencyKey = `REPORT_RUN:${sched.id}:${timeBucket}`
    const runAt = getRunAtBucket(now)

    try {
      const result = await enqueueJob(supabase, {
        agency_id: sched.agency_id,
        client_id: sched.client_id,
        job_type: 'REPORT_RUN',
        payload: {
          schedule_id: sched.id,
          template_id: sched.template_id,
          client_id: sched.client_id,
          agency_id: sched.agency_id,
        },
        idempotency_key: idempotencyKey,
        run_at: runAt,
      })
      if (result.inserted) enqueuedCount++
      else duplicatesSkipped++
    } catch {
      // skip on error, continue with others
    }
  }

  return NextResponse.json({
    queued: true,
    job_type: 'REPORT_RUN',
    enqueued_count: enqueuedCount,
    duplicates_skipped: duplicatesSkipped,
  })
}
