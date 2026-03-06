import { NextResponse } from 'next/server'
import { requireCronAuth } from '@/lib/cron/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { enqueueJob } from '@/lib/cron/enqueue'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Cron: enqueue UPSELL_EVAL jobs (one per agency with active triggers per day).
 * Heavy work moved to services/worker/upsellEvalHandler.ts (worker will call it).
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

  const { data: triggers, error: trigError } = await supabase
    .from('upsell_triggers')
    .select('agency_id')
    .eq('is_active', true)

  if (trigError || !triggers?.length) {
    return NextResponse.json({
      queued: true,
      job_type: 'UPSELL_EVAL',
      enqueued_count: 0,
      duplicates_skipped: 0,
      message: 'No active triggers or error',
    })
  }

  const agencyIds = Array.from(new Set(triggers.map((t) => t.agency_id)))
  let enqueuedCount = 0
  let duplicatesSkipped = 0

  for (const agencyId of agencyIds) {
    const idempotencyKey = `UPSELL_EVAL:${agencyId}:${dateBucket}`

    try {
      const result = await enqueueJob(supabase, {
        agency_id: agencyId,
        job_type: 'UPSELL_EVAL',
        payload: { agency_id: agencyId },
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
    job_type: 'UPSELL_EVAL',
    enqueued_count: enqueuedCount,
    duplicates_skipped: duplicatesSkipped,
  })
}
