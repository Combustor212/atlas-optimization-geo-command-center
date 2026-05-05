/**
 * Competitive Analysis - MGO backend compatible
 *
 * The competitor fetch tries multiple search strategies in order before
 * giving up:
 *   1. Nearby Search filtered by the selected business's primary type
 *   2. Nearby Search with NO type filter (broader)
 *   3. Nearby Search with a broader fallback category derived from types
 *   4. Text Search using "<category> near <city/address>"
 *
 * Filtering is intentionally lenient: a result is kept as a valid
 * competitor when it has a `place_id` AND (rating OR user_ratings_total)
 * AND it is not the selected business and not a corporate-office shell.
 */
import type { MarketContext, CompetitivePercentile } from './meoSchema'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || ''
const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place'

// Standardized competitor search radius (10 miles)
export const COMPETITOR_RADIUS_MILES = 10
export const COMPETITOR_RADIUS_METERS = 16093

interface CompetitorData {
  place_id: string
  name: string
  rating: number
  reviews: number
  photos: number
  types: string[]
  formatted_address?: string
}

export interface CompetitorAttemptDebug {
  strategy: string
  rawCount: number
  afterFilterCount: number
  /** Optional human-readable note (e.g. "type=meal_takeaway", HTTP error). */
  note?: string
}

interface CompetitiveAnalysisError {
  error: string
  reason: string
  details?: unknown
  attempts?: CompetitorAttemptDebug[]
}

type RawNearbyPlace = {
  place_id?: string
  rating?: number
  user_ratings_total?: number
  types?: string[]
  name?: string
  photos?: unknown[]
  formatted_address?: string
  vicinity?: string
}

async function nearbySearch(
  targetLat: number,
  targetLng: number,
  radius: number,
  type: string | null
): Promise<{ results: RawNearbyPlace[]; status: string } | null> {
  const url = new URL(`${PLACES_API_BASE}/nearbysearch/json`)
  url.searchParams.set('location', `${targetLat},${targetLng}`)
  url.searchParams.set('radius', radius.toString())
  if (type) url.searchParams.set('type', type)
  url.searchParams.set('key', API_KEY)

  try {
    const response = await fetch(url.toString())
    if (!response.ok) return null
    const data = (await response.json()) as { status: string; results?: unknown[] }
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.warn(`[Competitors] nearbySearch type=${type ?? '<none>'} status=${data.status}`)
      return null
    }
    return { results: (data.results || []) as RawNearbyPlace[], status: data.status }
  } catch (err) {
    console.warn('[Competitors] nearbySearch threw:', err instanceof Error ? err.message : err)
    return null
  }
}

async function textSearch(query: string): Promise<{ results: RawNearbyPlace[]; status: string } | null> {
  const url = new URL(`${PLACES_API_BASE}/textsearch/json`)
  url.searchParams.set('query', query)
  url.searchParams.set('key', API_KEY)

  try {
    const response = await fetch(url.toString())
    if (!response.ok) return null
    const data = (await response.json()) as { status: string; results?: unknown[] }
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.warn(`[Competitors] textSearch query="${query}" status=${data.status}`)
      return null
    }
    return { results: (data.results || []) as RawNearbyPlace[], status: data.status }
  } catch (err) {
    console.warn('[Competitors] textSearch threw:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Filter raw Places results into a valid competitor set.
 *
 * Lenient by design — rejecting based on missing `rating` AND `user_ratings_total`
 * was the previous source of "0 competitors found" reports. A result is now
 * kept as long as it has either signal (so it carries SOME information about
 * its market position).
 */
function filterValidCompetitors(
  places: RawNearbyPlace[],
  targetPlaceId: string
): CompetitorData[] {
  return places
    .filter((p) => {
      if (!p.place_id || p.place_id === targetPlaceId) return false
      const ratingOk = typeof p.rating === 'number' && isFinite(p.rating) && p.rating > 0
      const reviewsOk =
        typeof p.user_ratings_total === 'number' &&
        isFinite(p.user_ratings_total) &&
        p.user_ratings_total > 0
      // Require AT LEAST ONE of the two — this is the actual competitive signal.
      if (!ratingOk && !reviewsOk) return false
      const types = (p.types || []) as string[]
      const name = (p.name || '').toLowerCase()
      if (
        types.includes('corporate_office') ||
        types.includes('headquarters') ||
        name.includes('corporate office') ||
        name.includes('national office') ||
        name.includes('administrative office')
      ) return false
      if (types.includes('holding_company')) return false
      return true
    })
    .map((p) => ({
      place_id: p.place_id as string,
      name: p.name || 'Unknown',
      // Use 0 only when the field is genuinely absent so the engine sees the right signal.
      rating: typeof p.rating === 'number' && isFinite(p.rating) ? p.rating : 0,
      reviews:
        typeof p.user_ratings_total === 'number' && isFinite(p.user_ratings_total)
          ? p.user_ratings_total
          : 0,
      // Nearby Search returns at most 1 photo reference — useless as a count.
      photos: 0,
      types: (p.types || []) as string[],
      formatted_address: p.formatted_address || p.vicinity,
    }))
}

/**
 * Pick a broader fallback type when the primary type is too narrow.
 *
 * For example a McDonald's may have primary type `meal_takeaway`, but most
 * useful competitor signal lives under `restaurant` or `food`. This is only
 * used after the primary-type pass + the no-type pass have both failed to
 * yield ≥3 valid competitors.
 */
function pickBroadFallbackType(types: string[] | undefined): string | null {
  if (!types?.length) return null
  // Prefer the most general food/retail buckets if present.
  const buckets = [
    'restaurant', 'food', 'cafe', 'bakery', 'bar', 'meal_delivery',
    'store', 'shopping_mall',
    'health', 'doctor', 'dentist',
    'lawyer', 'real_estate_agency', 'lodging', 'gym',
    'beauty_salon', 'hair_care', 'spa',
    'car_dealer', 'car_repair',
  ]
  for (const b of buckets) if (types.includes(b)) return b
  // Otherwise: fall back to the second type if it's broader than the first.
  return types.length >= 2 ? types[1] : null
}

function categoryQueryForTextSearch(types: string[] | undefined): string {
  if (!types?.length) return 'business'
  const human: Record<string, string> = {
    meal_takeaway: 'fast food restaurant',
    meal_delivery: 'restaurant',
    fast_food_restaurant: 'fast food restaurant',
    hamburger_restaurant: 'burger restaurant',
    pizza_restaurant: 'pizza restaurant',
    coffee_shop: 'coffee shop',
    cafe: 'cafe',
    bakery: 'bakery',
    bar: 'bar',
    restaurant: 'restaurant',
    food: 'restaurant',
    store: 'store',
    car_dealer: 'car dealership',
    car_repair: 'auto repair shop',
    gym: 'gym',
    beauty_salon: 'beauty salon',
    hair_care: 'hair salon',
    spa: 'spa',
    dentist: 'dentist',
    doctor: 'medical clinic',
    lawyer: 'law firm',
    real_estate_agency: 'real estate agency',
    lodging: 'hotel',
  }
  for (const t of types) {
    const label = human[t]
    if (label) return label
  }
  // Last resort: humanize whatever type we have.
  const t = types[0].replace(/_/g, ' ')
  return t || 'business'
}

interface FetchOutcome {
  competitors: CompetitorData[]
  attempts: CompetitorAttemptDebug[]
  /**
   * `true` if every attempt returned `null` (network/HTTP/REQUEST_DENIED) —
   * a strong signal that the server-side Google Places API key is restricted
   * or otherwise unable to make outbound calls.
   */
  apiUnreachable: boolean
}

async function fetchRealCompetitors(
  targetLat: number,
  targetLng: number,
  targetPlaceId: string,
  targetTypes: string[] | undefined,
  locationLabel: string,
  radius = COMPETITOR_RADIUS_METERS
): Promise<FetchOutcome> {
  const attempts: CompetitorAttemptDebug[] = []
  const merged = new Map<string, RawNearbyPlace>()
  let anyApiSuccess = false

  if (!API_KEY) {
    return { competitors: [], attempts, apiUnreachable: true }
  }

  const recordAttempt = async (
    strategy: string,
    note: string | undefined,
    runner: () => Promise<{ results: RawNearbyPlace[]; status: string } | null>
  ): Promise<RawNearbyPlace[]> => {
    const result = await runner()
    if (result === null) {
      attempts.push({ strategy, rawCount: 0, afterFilterCount: 0, note: note ? `${note} → request failed` : 'request failed' })
      return []
    }
    anyApiSuccess = true
    const filtered = filterValidCompetitors(result.results, targetPlaceId)
    attempts.push({
      strategy,
      rawCount: result.results.length,
      afterFilterCount: filtered.length,
      note,
    })
    for (const p of result.results) if (p.place_id) merged.set(p.place_id, p)
    return result.results
  }

  // ── Pass 1: Nearby Search filtered by the primary type ────────────────────
  const primaryType = targetTypes?.length ? targetTypes[0] : null
  if (primaryType) {
    await recordAttempt(
      'nearby-primary-type',
      `type=${primaryType}`,
      () => nearbySearch(targetLat, targetLng, radius, primaryType)
    )
  } else {
    attempts.push({ strategy: 'nearby-primary-type', rawCount: 0, afterFilterCount: 0, note: 'no primary type on selected place' })
  }

  let competitors = filterValidCompetitors(Array.from(merged.values()), targetPlaceId)
  if (competitors.length >= 3) {
    return { competitors, attempts, apiUnreachable: false }
  }

  // ── Pass 2: Nearby Search with NO type filter (broader) ───────────────────
  await recordAttempt(
    'nearby-no-type',
    'type=<none>',
    () => nearbySearch(targetLat, targetLng, radius, null)
  )
  competitors = filterValidCompetitors(Array.from(merged.values()), targetPlaceId)
  if (competitors.length >= 3) {
    return { competitors, attempts, apiUnreachable: false }
  }

  // ── Pass 3: Nearby Search using a broader bucket type ─────────────────────
  const broadType = pickBroadFallbackType(targetTypes)
  if (broadType && broadType !== primaryType) {
    await recordAttempt(
      'nearby-broad-type',
      `type=${broadType}`,
      () => nearbySearch(targetLat, targetLng, radius, broadType)
    )
    competitors = filterValidCompetitors(Array.from(merged.values()), targetPlaceId)
    if (competitors.length >= 3) {
      return { competitors, attempts, apiUnreachable: false }
    }
  }

  // ── Pass 4: Text Search "<category> near <location>" ──────────────────────
  if (locationLabel) {
    const category = categoryQueryForTextSearch(targetTypes)
    const query = `${category} near ${locationLabel}`.trim()
    await recordAttempt(
      'text-search-category-location',
      `query="${query}"`,
      () => textSearch(query)
    )
    competitors = filterValidCompetitors(Array.from(merged.values()), targetPlaceId)
  } else {
    attempts.push({ strategy: 'text-search-category-location', rawCount: 0, afterFilterCount: 0, note: 'no location label available' })
  }

  return {
    competitors,
    attempts,
    apiUnreachable: !anyApiSuccess,
  }
}

function calculatePercentile(value: number, dataset: number[]): number {
  if (dataset.length === 0) return 50
  const sorted = [...dataset].sort((a, b) => a - b)
  const below = sorted.filter((v) => v < value).length
  const equal = sorted.filter((v) => v === value).length
  return Math.round(((below + equal / 2) / sorted.length) * 100)
}

function getMarketPositionLabel(avgPercentile: number): string {
  if (avgPercentile >= 90) return 'Top 10% - Market Leader'
  if (avgPercentile >= 80) return 'Top 20% - Strong Performer'
  if (avgPercentile >= 60) return 'Above Average'
  if (avgPercentile >= 40) return 'Average'
  if (avgPercentile >= 20) return 'Below Average'
  return 'Bottom 20% - Needs Improvement'
}

export interface AnalyzeCompetitivePositionResult {
  marketContext: MarketContext | null
  competitors: CompetitorData[]
  attempts: CompetitorAttemptDebug[]
  apiUnreachable: boolean
  reasonIfUnavailable?: string
}

export async function analyzeCompetitivePosition(
  _businessName: string,
  rating: number,
  reviews: number,
  photos: number,
  _category: string,
  location: string,
  targetPlaceId: string | undefined,
  targetLat: number | undefined,
  targetLng: number | undefined,
  targetTypes: string[] | undefined
): Promise<AnalyzeCompetitivePositionResult | CompetitiveAnalysisError> {
  if (!targetPlaceId || typeof targetLat !== 'number' || typeof targetLng !== 'number') {
    return {
      error: 'MEO competitive analysis blocked',
      reason: 'Missing target placeId or lat/lng',
      attempts: [],
    }
  }

  const { competitors, attempts, apiUnreachable } = await fetchRealCompetitors(
    targetLat,
    targetLng,
    targetPlaceId,
    targetTypes,
    location,
    COMPETITOR_RADIUS_METERS
  )

  console.log(
    '[Competitors] attempts:',
    attempts.map((a) => `${a.strategy}=${a.afterFilterCount}/${a.rawCount}`).join(' | '),
    `final=${competitors.length}`,
    apiUnreachable ? '(API unreachable)' : ''
  )

  if (competitors.length < 3) {
    const reason = apiUnreachable
      ? 'Google Places API was unreachable from the server (likely API key restriction).'
      : `Only ${competitors.length} valid competitors found across all strategies (need ≥ 3).`
    return {
      marketContext: null,
      competitors,
      attempts,
      apiUnreachable,
      reasonIfUnavailable: reason,
    }
  }

  const localAvgRating = competitors.reduce((s, c) => s + c.rating, 0) / competitors.length
  const localAvgReviews = competitors.reduce((s, c) => s + c.reviews, 0) / competitors.length
  const localAvgPhotos = 0 // Nearby Search photo data is unreliable (always ≤1) — not displayed.

  const ratingPercentile = calculatePercentile(rating, competitors.map((c) => c.rating))
  const reviewsPercentile = calculatePercentile(reviews, competitors.map((c) => c.reviews))
  const photosPercentile = 50
  const avgPercentile = (ratingPercentile + reviewsPercentile) / 2

  return {
    marketContext: {
      localAvgRating: Math.round(localAvgRating * 10) / 10,
      localAvgReviews: Math.round(localAvgReviews),
      localAvgPhotos: Math.round(localAvgPhotos),
      competitorsAnalyzed: competitors.length,
      competitivePercentile: { rating: ratingPercentile, reviews: reviewsPercentile, photos: photosPercentile },
      marketPosition: getMarketPositionLabel(avgPercentile),
    },
    competitors,
    attempts,
    apiUnreachable: false,
  }
}

export function isLocalLeader(rating: number, reviews: number, marketPosition: string): boolean {
  if (rating >= 4.8 && reviews >= 150) return true
  return rating >= 4.7 && reviews >= 50 && (marketPosition.includes('Top 10%') || marketPosition.includes('Top 20%') || marketPosition.includes('Strong Performer'))
}

export function isPerfectProfile(
  hasPhone: boolean,
  hasWebsite: boolean,
  hasHours: boolean,
  hasDescription: boolean,
  photoCount: number,
  rating: number,
  reviews: number
): boolean {
  return hasPhone && hasWebsite && hasHours && hasDescription && photoCount >= 10 && rating >= 4.5 && reviews >= 20
}

export function calculateDominanceType(
  finalScore: number,
  isFranchise: boolean,
  isLocalLeader: boolean,
  isPerfectProfile: boolean,
  percentiles: CompetitivePercentile
): string | null {
  const avgPercentile = (percentiles.rating + percentiles.reviews + percentiles.photos) / 3
  if (isPerfectProfile && isLocalLeader && avgPercentile >= 90) return 'Absolute Market Leader'
  if (isLocalLeader && avgPercentile >= 80) return 'Local Leader'
  if (isLocalLeader) return 'Local Leader'
  if (isFranchise && finalScore >= 65 && avgPercentile >= 70) return 'Strong Franchise Presence'
  if (isPerfectProfile && avgPercentile >= 70) return 'Well-Optimized Business'
  if (avgPercentile >= 80) return 'Strong Competitor'
  return null
}
