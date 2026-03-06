import { NextResponse } from 'next/server'
import { requireCronAuth } from '@/lib/cron/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { enqueueJob } from '@/lib/cron/enqueue'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Cron: enqueue HEALTH_SCORE_REFRESH jobs (one per agency per day).
 * Heavy work moved to services/worker/healthScoreRefreshHandler.ts (worker will call it).
 */
export async function GET(req: Request) {
  try {
    requireCronAuth(req)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const supabase = createServiceClient()
  const now = new Date()
  const dateBucket = now.toISOString().slice(0, 10)

  const { data: agencies, error: agencyErr } = await supabase
    .from('agencies')
    .select('id')

  if (agencyErr || !agencies?.length) {
    return NextResponse.json({
      queued: true,
      job_type: 'HEALTH_SCORE_REFRESH',
      enqueued_count: 0,
      duplicates_skipped: 0,
      message: 'No agencies or error',
    })
  }

  let enqueuedCount = 0
  let duplicatesSkipped = 0

  for (const agency of agencies) {
    const idempotencyKey = `HEALTH_SCORE_REFRESH:${agency.id}:${dateBucket}`

    try {
      const result = await enqueueJob(supabase, {
        agency_id: agency.id,
        job_type: 'HEALTH_SCORE_REFRESH',
        payload: { agency_id: agency.id },
        idempotency_key: idempotencyKey,
      })
      if (result.inserted) enqueuedCount++
      else duplicatesSkipped++
    } catch {
      // skip on error
    }
  }

  return NextResponse.json({
    queued: true,
    job_type: 'HEALTH_SCORE_REFRESH',
    enqueued_count: enqueuedCount,
    duplicates_skipped: duplicatesSkipped,
  })
}
