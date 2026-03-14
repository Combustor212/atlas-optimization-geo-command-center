/**
 * Competitive Analysis - MGO backend compatible
 */
import type { MarketContext, CompetitivePercentile } from './meoSchema'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || ''
const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place'

interface CompetitorData {
  place_id: string
  name: string
  rating: number
  reviews: number
  photos: number
  types: string[]
}

interface CompetitiveAnalysisError {
  error: string
  reason: string
  details?: unknown
}

async function fetchRealCompetitors(
  targetLat: number,
  targetLng: number,
  targetPlaceId: string,
  targetTypes: string[] | undefined,
  radius = 12000
): Promise<CompetitorData[] | null> {
  if (!API_KEY) return null

  try {
    const primaryType = targetTypes?.length ? targetTypes[0] : null
    const nearbyUrl = new URL(`${PLACES_API_BASE}/nearbysearch/json`)
    nearbyUrl.searchParams.set('location', `${targetLat},${targetLng}`)
    nearbyUrl.searchParams.set('radius', radius.toString())
    if (primaryType) nearbyUrl.searchParams.set('type', primaryType)
    nearbyUrl.searchParams.set('key', API_KEY)

    const response = await fetch(nearbyUrl.toString())
    if (!response.ok) return null

    const data = (await response.json()) as { status: string; results?: unknown[]; error_message?: string }
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return null

    let nearbyPlaces = data.results || []

    if (nearbyPlaces.length === 0 && primaryType) {
      const fallbackUrl = new URL(`${PLACES_API_BASE}/nearbysearch/json`)
      fallbackUrl.searchParams.set('location', `${targetLat},${targetLng}`)
      fallbackUrl.searchParams.set('radius', radius.toString())
      fallbackUrl.searchParams.set('key', API_KEY)
      const fallbackResponse = await fetch(fallbackUrl.toString())
      if (fallbackResponse.ok) {
        const fallbackData = (await fallbackResponse.json()) as { status: string; results?: unknown[] }
        if (fallbackData.status === 'OK' || fallbackData.status === 'ZERO_RESULTS') {
          nearbyPlaces = fallbackData.results || []
        }
      }
    }

    const competitors: CompetitorData[] = nearbyPlaces
      .filter((p: { place_id?: string; rating?: number; user_ratings_total?: number; types?: string[]; name?: string }) => {
        if (!p.place_id || p.place_id === targetPlaceId) return false
        if (typeof p.rating !== 'number' || typeof p.user_ratings_total !== 'number') return false
        const types = (p.types || []) as string[]
        const name = (p.name || '').toLowerCase()
        if (types.includes('corporate_office') || types.includes('headquarters') || name.includes('headquarters') || name.includes('corporate') || name.includes('national office')) return false
        if (types.includes('holding_company') || name.includes('holdings')) return false
        return true
      })
      .map((p: { place_id: string; name?: string; rating: number; user_ratings_total: number; photos?: unknown[]; types?: string[] }) => ({
        place_id: p.place_id,
        name: p.name || 'Unknown',
        rating: p.rating,
        reviews: p.user_ratings_total,
        photos: 0, // Nearby Search only returns 1 photo reference per place regardless of actual count — not usable
        types: p.types || [],
      }))

    return competitors
  } catch {
    return null
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
): Promise<MarketContext | CompetitiveAnalysisError> {
  if (!targetPlaceId || typeof targetLat !== 'number' || typeof targetLng !== 'number') {
    return { error: 'MEO competitive analysis blocked', reason: 'Missing target placeId or lat/lng' }
  }

  const competitors = await fetchRealCompetitors(targetLat, targetLng, targetPlaceId, targetTypes, 12000)

  if (!competitors || competitors.length < 3) {
    return {
      error: 'MEO competitive analysis blocked',
      reason: `Found only ${competitors?.length || 0} competitors (minimum 3 required)`,
      details: { found: competitors?.length || 0, required: 3, location, targetPlaceId },
    }
  }

  const localAvgRating = competitors.reduce((s, c) => s + c.rating, 0) / competitors.length
  const localAvgReviews = competitors.reduce((s, c) => s + c.reviews, 0) / competitors.length
  const localAvgPhotos = 0 // Nearby Search photo data is unreliable (always 1) — not displayed

  const ratingPercentile = calculatePercentile(rating, competitors.map((c) => c.rating))
  const reviewsPercentile = calculatePercentile(reviews, competitors.map((c) => c.reviews))
  const photosPercentile = 50 // Not calculated — competitor photo counts from Nearby Search are not reliable
  const avgPercentile = (ratingPercentile + reviewsPercentile) / 2 // Only use reliable signals

  return {
    localAvgRating: Math.round(localAvgRating * 10) / 10,
    localAvgReviews: Math.round(localAvgReviews),
    localAvgPhotos: Math.round(localAvgPhotos),
    competitorsAnalyzed: competitors.length,
    competitivePercentile: { rating: ratingPercentile, reviews: reviewsPercentile, photos: photosPercentile },
    marketPosition: getMarketPositionLabel(avgPercentile),
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
