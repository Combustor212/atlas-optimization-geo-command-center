import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/lib/cron/auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { enqueueJob } from '@/lib/cron/enqueue'
import { getISOWeek, getISOWeekYear } from 'date-fns'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const minIntervalDays = { weekly: 7, monthly: 30 } as const

/**
 * Cron: enqueue AI_QUERY_RUN jobs for due ai_queries.
 * Heavy work moved to services/worker/aiQueryRunHandler.ts (worker will call it).
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

  const { data: queries, error: qErr } = await supabase
    .from('ai_queries')
    .select('id, agency_id, location_id, frequency, platform, query_text')
    .eq('is_active', true)

  if (qErr || !queries?.length) {
    return NextResponse.json({
      queued: true,
      job_type: 'AI_QUERY_RUN',
      enqueued_count: 0,
      duplicates_skipped: 0,
      message: 'No active queries or error',
    })
  }

  let enqueuedCount = 0
  let duplicatesSkipped = 0

  for (const q of queries) {
    const intervalDays = minIntervalDays[q.frequency as keyof typeof minIntervalDays] ?? 7
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - intervalDays)

    const { data: lastRun } = await supabase
      .from('ai_query_runs')
      .select('id, ran_at')
      .eq('ai_query_id', q.id)
      .order('ran_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastRanAt = lastRun?.ran_at ? new Date(lastRun.ran_at) : null
    if (lastRanAt && lastRanAt >= cutoff) continue

    const isoWeek = getISOWeek(now)
    const isoWeekYear = getISOWeekYear(now)
    const weekBucket = `${isoWeekYear}-W${String(isoWeek).padStart(2, '0')}`
    const monthBucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    const bucket = q.frequency === 'monthly' ? monthBucket : weekBucket
    const idempotencyKey = `AI_QUERY_RUN:${q.id}:${bucket}`

    try {
      const result = await enqueueJob(supabase, {
        agency_id: q.agency_id,
        location_id: q.location_id ?? null,
        job_type: 'AI_QUERY_RUN',
        payload: {
          ai_query_id: q.id,
          platform: q.platform,
          query_text: q.query_text,
          location_id: q.location_id,
        },
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
    job_type: 'AI_QUERY_RUN',
    enqueued_count: enqueuedCount,
    duplicates_skipped: duplicatesSkipped,
  })
}
