/**
 * PLACE_DETAILS_REFRESH worker handler.
 * TODO: Worker will call handlePlaceDetailsRefresh(job) when processing PLACE_DETAILS_REFRESH jobs.
 * Extracted from apps/geo-command-center/src/app/api/cron/place-details/route.ts
 *
 * Job can be per-agency (payload: { agency_id }) or per-location (payload: { location_id }).
 * Per-agency: fetches all locations with place_id for that agency and refreshes each.
 */

import { createServiceClient } from '@/lib/supabase/service'
import { fetchPlaceDetails, sleep, DELAY_MS } from '@/lib/google/places'

export interface PlaceDetailsRefreshPayload {
  agency_id?: string
  location_id?: string
}

/**
 * Refresh place details (reviews) for locations.
 * If agency_id: refresh all locations with place_id in that agency.
 * If location_id: refresh that single location.
 */
export async function handlePlaceDetailsRefresh(
  payload: PlaceDetailsRefreshPayload
): Promise<{ ok: boolean; processed: number; errors: string[] }> {
  const supabase = createServiceClient()
  const errors: string[] = []
  let processed = 0

  let locations: { id: string; place_id: string; client_id: string }[] = []

  if (payload.location_id) {
    const { data } = await supabase
      .from('locations')
      .select('id, place_id, client_id')
      .eq('id', payload.location_id)
      .not('place_id', 'is', null)
    locations = (data ?? []) as typeof locations
  } else if (payload.agency_id) {
    const { data } = await supabase
      .from('locations')
      .select('id, place_id, client_id')
      .eq('agency_id', payload.agency_id)
      .not('place_id', 'is', null)
      .limit(200)
    locations = (data ?? []) as typeof locations
  } else {
    return { ok: false, processed: 0, errors: ['Missing agency_id or location_id'] }
  }

  const capturedDay = new Date().toISOString().slice(0, 10)

  for (const loc of locations) {
    const placeId = loc.place_id as string
    if (!placeId) continue

    try {
      const details = await fetchPlaceDetails(placeId)
      await sleep(DELAY_MS)

      if (!details) continue

      const { error: upsertErr } = await supabase.from('reviews').upsert(
        {
          location_id: loc.id,
          count: details.user_ratings_total ?? 0,
          avg_rating: details.rating ?? 0,
          recorded_at: capturedDay,
          source: 'google_places_details',
        },
        { onConflict: 'location_id,recorded_at,source' }
      )

      if (upsertErr) {
        errors.push(`loc ${loc.id}: ${upsertErr.message}`)
      } else {
        processed++
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`loc ${loc.id}: ${msg}`)
    }
  }

  return { ok: errors.length === 0, processed, errors }
}
