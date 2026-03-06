/**
 * RANK_REFRESH job handler — heavy work (geocode, nearbySearch, upsert rankings).
 * Called by worker when processing RANK_REFRESH jobs via claim_jobs().
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { nearbySearch, geocodeAddress, sleep, DELAY_MS } from '@/lib/google/places'

const NOT_FOUND_RANK = 21
const KEYWORD_LIMIT = 25

export type RankRefreshPayload = { location_id: string; source?: string }

export type RankRefreshOptions = {
  batchKeywordLimit?: number
  timeoutMs?: number
  /** Optional: only process these keyword ids (e.g. from track-ranking). */
  keywordIds?: string[]
}

export type RankRefreshResult = {
  processed: number
  skipped: number
  errors: string[]
}

/**
 * Run RANK_REFRESH job: geocode address, nearbySearch per keyword, upsert into rankings.
 * Heavy work — called by worker, not by Vercel cron.
 *
 * TODO: when rankings gets agency_id column, include agency_id in the upsert payload.
 */
export async function runRankRefreshJob(
  payload: RankRefreshPayload,
  supabase: SupabaseClient,
  opts?: RankRefreshOptions
): Promise<RankRefreshResult> {
  const errors: string[] = []
  let processed = 0
  let skipped = 0

  const limit = opts?.batchKeywordLimit ?? KEYWORD_LIMIT
  const timeoutMs = opts?.timeoutMs
  const startTime = timeoutMs ? Date.now() : 0

  const { data: pairs, error: pairsErr } = await supabase
    .from('location_keywords')
    .select('id, location_id, keyword')
    .eq('location_id', payload.location_id)
    .eq('is_active', true)
    .limit(limit)

  if (pairsErr || !pairs?.length) {
    return {
      processed: 0,
      skipped: 0,
      errors: pairsErr ? [pairsErr.message] : [],
    }
  }

  const { data: loc } = await supabase
    .from('locations')
    .select('id, place_id, address, city, state, zip')
    .eq('id', payload.location_id)
    .single()

  if (!loc) {
    return {
      processed: 0,
      skipped: pairs.length,
      errors: ['Location not found'],
    }
  }

  const placeId = loc.place_id as string | null
  if (!placeId) {
    return {
      processed: 0,
      skipped: pairs.length,
      errors: ['Location has no place_id'],
    }
  }

  const fullAddress = [loc.address, loc.city, loc.state, loc.zip].filter(Boolean).join(', ')
  const coords = await geocodeAddress(fullAddress || String(loc.zip || loc.city || 'US'))
  if (!coords) {
    return {
      processed: 0,
      skipped: pairs.length,
      errors: ['Could not geocode address'],
    }
  }

  const capturedHour = new Date()
  capturedHour.setMinutes(0, 0, 0)
  const recordedAt = capturedHour.toISOString()

  const source = payload.source ?? 'google_places_nearby_proxy'

  const pairsToProcess = opts?.keywordIds
    ? pairs.filter((p) => opts!.keywordIds!.includes(p.id))
    : pairs

  for (const pair of pairsToProcess) {
    if (timeoutMs && Date.now() - startTime >= timeoutMs) {
      skipped = pairsToProcess.length - processed
      break
    }

    try {
      const results = await nearbySearch({
        lat: coords.lat,
        lng: coords.lng,
        keyword: pair.keyword as string,
      })
      await sleep(DELAY_MS)

      const idx = results.findIndex((r) => r.place_id === placeId)
      const rankPosition = idx >= 0 ? idx + 1 : NOT_FOUND_RANK

      const { error: upsertErr } = await supabase.from('rankings').upsert(
        {
          location_id: pair.location_id,
          keyword: pair.keyword,
          keyword_type: 'primary',
          map_pack_position: rankPosition,
          organic_position: null,
          recorded_at: recordedAt,
          source,
        },
        { onConflict: 'location_id,keyword,recorded_at,source' }
      )

      if (upsertErr) {
        errors.push(`pair ${pair.id}: ${upsertErr.message}`)
      } else {
        processed++
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`pair ${pair.id}: ${msg}`)
    }
  }

  return { processed, skipped, errors }
}
