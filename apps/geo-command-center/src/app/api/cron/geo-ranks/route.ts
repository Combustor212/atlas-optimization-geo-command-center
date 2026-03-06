import { NextResponse } from 'next/server'
import { requireCronAuth } from '@/lib/cron/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { enqueueJob } from '@/lib/cron/enqueue'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

const BATCH_LIMIT = parseInt(process.env.CRON_BATCH_LIMIT ?? '200', 10)

/**
 * Cron: enqueue RANK_REFRESH jobs for locations with active keywords.
 * Heavy work (geocode, nearbySearch, upsert rankings) is processed by worker via runRankRefreshJob.
 */
export async function GET(req: Request) {
  try {
    requireCronAuth(req)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const supabase = createServiceClient()
  const dateBucket = new Date().toISOString().slice(0, 10) // UTC YYYY-MM-DD

  const { data: pairs, error: pairsErr } = await supabase
    .from('location_keywords')
    .select('id, location_id, agency_id')
    .eq('is_active', true)
    .limit(BATCH_LIMIT * 25)

  if (pairsErr || !pairs?.length) {
    return NextResponse.json({
      ok: true,
      enqueued: 0,
      duplicates_skipped: 0,
      errors: pairsErr ? [pairsErr.message] : [],
      message: 'No location_keywords found or error. Ranks are processed by worker.',
    })
  }

  const locationIds = Array.from(new Set(pairs.map((p) => p.location_id)))
  const locToAgency = new Map(pairs.map((p) => [p.location_id, p.agency_id]))

  let enqueued = 0
  let duplicatesSkipped = 0
  const errors: string[] = []

  for (const locationId of locationIds) {
    const agencyId = locToAgency.get(locationId)
    if (!agencyId) continue

    const idempotencyKey = `RANK_REFRESH:${locationId}:${dateBucket}`

    try {
      const result = await enqueueJob(supabase, {
        agency_id: agencyId,
        location_id: locationId,
        job_type: 'RANK_REFRESH',
        payload: { location_id: locationId, source: 'google_places_nearby_proxy' },
        idempotency_key: idempotencyKey,
      })
      if (result.inserted) enqueued++
      else duplicatesSkipped++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`location ${locationId}: ${msg}`.slice(0, 120))
    }
  }

  return NextResponse.json({
    ok: true,
    enqueued,
    duplicates_skipped: duplicatesSkipped,
    errors,
    message: 'Ranks are processed by worker.',
  })
}
