/**
 * GEO Competitor Identification
 *
 * Fetches 3–5 relevant competitors for AI visibility comparison using:
 * - Same category
 * - Same city or nearby market
 * - Strong review presence
 * - Similar services
 */
import {
  searchNearbyPlaces,
  getPlaceDetails,
  type GooglePlacesConfig,
} from '@/lib/integrations/google-places'

// Standardized competitor search radius (10 miles)
export const COMPETITOR_RADIUS_MILES = 10
export const COMPETITOR_RADIUS_METERS = 16093

// Map our category labels to Google Places API type (for nearby search)
const CATEGORY_TO_PLACES_TYPE: Record<string, string> = {
  'coffee shop': 'cafe',
  cafe: 'cafe',
  restaurant: 'restaurant',
  bar: 'bar',
  bakery: 'bakery',
  gym: 'gym',
  spa: 'spa',
  'hair salon': 'hair_care',
  'beauty salon': 'beauty_salon',
  dentist: 'dentist',
  doctor: 'doctor',
  lawyer: 'lawyer',
  'real estate': 'real_estate_agency',
  plumber: 'plumber',
  'auto repair': 'car_repair',
  barber: 'barber_shop',
  store: 'store',
  pharmacy: 'pharmacy',
  veterinarian: 'veterinary_care',
  hotel: 'lodging',
}

export interface GEOCompetitorSignal {
  name: string
  address?: string
  rating?: number
  totalReviews?: number
  website?: string
  category?: string
  hasWebsite?: boolean
}

/**
 * Fetch 3–5 competitors for a business using Google Places Nearby Search.
 * Excludes the target place. Prefers businesses with strong review presence.
 */
export async function fetchGeoCompetitors(
  config: GooglePlacesConfig,
  params: {
    targetPlaceId: string
    targetName: string
    lat: number
    lng: number
    category: string
    locationLabel?: string
  }
): Promise<GEOCompetitorSignal[]> {
  const { targetPlaceId, targetName, lat, lng, category } = params
  const placesType = CATEGORY_TO_PLACES_TYPE[category.toLowerCase()] || null
  const keyword = category || 'local business'

  try {
    const results = await searchNearbyPlaces(config, {
      keyword,
      location: { lat, lng },
      radius: COMPETITOR_RADIUS_METERS, // 10 miles
      type: placesType || undefined,
    })

    // Exclude target, prefer businesses with reviews, limit to 5
    const filtered = results
      .filter(
        (p) =>
          p.placeId !== targetPlaceId &&
          !p.name.toLowerCase().includes(targetName.toLowerCase().slice(0, 8))
      )
      .sort((a, b) => {
        // Prefer more reviews, then higher rating
        const aReviews = a.userRatingsTotal ?? 0
        const bReviews = b.userRatingsTotal ?? 0
        if (bReviews !== aReviews) return bReviews - aReviews
        return (b.rating ?? 0) - (a.rating ?? 0)
      })
      .slice(0, 5)

    if (filtered.length === 0) return []

    // Enrich with place details for website (batch, but limit to avoid quota)
    const enriched: GEOCompetitorSignal[] = await Promise.all(
      filtered.slice(0, 5).map(async (p) => {
        try {
          const details = await getPlaceDetails(config, p.placeId)
          return {
            name: p.name,
            address: p.address || details?.formattedAddress,
            rating: p.rating ?? details?.rating ?? undefined,
            totalReviews: p.userRatingsTotal ?? details?.userRatingsTotal ?? undefined,
            website: details?.website,
            hasWebsite: !!details?.website,
            category,
          }
        } catch {
          return {
            name: p.name,
            address: p.address,
            rating: p.rating,
            totalReviews: p.userRatingsTotal,
            category,
          }
        }
      })
    )

    return enriched
  } catch (err) {
    console.error('[GEO Competitors] Fetch failed:', err)
    return []
  }
}
