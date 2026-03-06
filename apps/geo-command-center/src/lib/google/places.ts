/**
 * Google Places API wrappers for cron jobs.
 * Uses GOOGLE_MAPS_API_KEY or GOOGLE_PLACES_API_KEY.
 */

const API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY
const BASE_URL = 'https://maps.googleapis.com/maps/api/place'
const DELAY_MS = 150 // Backoff between calls

function getApiKey(): string {
  if (!API_KEY) throw new Error('GOOGLE_MAPS_API_KEY or GOOGLE_PLACES_API_KEY required')
  return API_KEY
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export interface PlaceDetailsResult {
  rating: number | null
  user_ratings_total: number | null
  formatted_address: string | null
  formatted_phone_number: string | null
  website: string | null
  business_status: string | null
}

/**
 * Fetch Place Details for a place_id. Returns core fields for snapshots.
 */
export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetailsResult | null> {
  const key = getApiKey()
  const url = new URL(`${BASE_URL}/details/json`)
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('key', key)
  url.searchParams.set(
    'fields',
    'rating,user_ratings_total,formatted_address,formatted_phone_number,website,business_status'
  )

  try {
    const res = await fetch(url.toString())
    const data = (await res.json()) as { status: string; result?: Record<string, unknown>; error_message?: string }

    if (data.status === 'REQUEST_DENIED' && data.error_message?.includes('quota')) {
      await sleep(DELAY_MS * 4)
      throw new Error(`Places API quota exceeded: ${data.error_message}`)
    }
    if (data.status === 'OVER_QUERY_LIMIT') {
      await sleep(DELAY_MS * 3)
      throw new Error('Places API over query limit')
    }
    if (data.status === 'NOT_FOUND' || data.status === 'ZERO_RESULTS') return null
    if (data.status !== 'OK') {
      throw new Error(`Places API status: ${data.status} - ${data.error_message ?? ''}`)
    }

    const r = data.result as Record<string, unknown>
    return {
      rating: typeof r.rating === 'number' ? r.rating : null,
      user_ratings_total: typeof r.user_ratings_total === 'number' ? r.user_ratings_total : null,
      formatted_address: typeof r.formatted_address === 'string' ? r.formatted_address : null,
      formatted_phone_number:
        typeof r.formatted_phone_number === 'string' ? r.formatted_phone_number : null,
      website: typeof r.website === 'string' ? r.website : null,
      business_status: typeof r.business_status === 'string' ? r.business_status : null,
    }
  } catch (e) {
    console.error('fetchPlaceDetails error:', placeId, e)
    throw e
  }
}

export interface NearbyResult {
  place_id: string
  name: string
}

/**
 * Nearby Search centered at lat/lng with keyword. Returns ordered results.
 */
export async function nearbySearch(params: {
  lat: number
  lng: number
  keyword: string
  radius?: number
}): Promise<NearbyResult[]> {
  const key = getApiKey()
  const url = new URL(`${BASE_URL}/nearbysearch/json`)
  url.searchParams.set('location', `${params.lat},${params.lng}`)
  url.searchParams.set('keyword', params.keyword)
  url.searchParams.set('radius', String(params.radius ?? 5000))
  url.searchParams.set('key', key)

  try {
    const res = await fetch(url.toString())
    const data = (await res.json()) as {
      status: string
      results?: Array<{ place_id: string; name: string }>
      error_message?: string
    }

    if (data.status === 'OVER_QUERY_LIMIT' || (data.status === 'REQUEST_DENIED' && data.error_message?.includes('quota'))) {
      await sleep(DELAY_MS * 2)
      throw new Error(`Places Nearby over limit: ${data.error_message ?? ''}`)
    }
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Places Nearby status: ${data.status} - ${data.error_message ?? ''}`)
    }

    const results = data.results ?? []
    return results.map((p) => ({ place_id: p.place_id, name: p.name }))
  } catch (e) {
    console.error('nearbySearch error:', params.keyword, e)
    throw e
  }
}

/**
 * Geocode an address to lat/lng. Returns null on failure.
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address?.trim()) return null
  const key = getApiKey()
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', address.trim())
  url.searchParams.set('key', key)
  try {
    const res = await fetch(url.toString())
    const data = (await res.json()) as { status: string; results?: Array<{ geometry: { location: { lat: number; lng: number } } }> }
    if (data.status === 'OK' && data.results?.[0]) {
      return {
        lat: data.results[0].geometry.location.lat,
        lng: data.results[0].geometry.location.lng,
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Sleep between API calls for rate limiting (call manually when batching).
 */
export { sleep, DELAY_MS }
