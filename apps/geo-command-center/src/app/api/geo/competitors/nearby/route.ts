/**
 * GET /api/geo/competitors/nearby?placeId=...&radius=5000&limit=10&category=...
 * Returns real competitors from Google Places API - MGO backend compatible.
 */
import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY
const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place'

const EXCLUDED_TYPES = [
  'lodging', 'hotel', 'motel', 'resort_hotel', 'apartment_hotel',
  'tourist_attraction', 'apartment_complex', 'hostel', 'campground', 'rv_park',
]

const CATEGORY_TYPE_MAP: Record<string, string[]> = {
  coffee_shop: ['cafe', 'coffee_shop', 'bakery'],
  cafe: ['cafe', 'coffee_shop', 'bakery'],
  barber_shop: ['hair_care', 'barber_shop'],
  hair_salon: ['hair_care', 'beauty_salon'],
  nail_salon: ['beauty_salon', 'nail_salon'],
  restaurant: ['restaurant', 'meal_takeaway', 'meal_delivery'],
  gym: ['gym', 'health'],
  dentist: ['dentist', 'health'],
  lawyer: ['lawyer'],
  real_estate: ['real_estate_agency'],
  plumber: ['plumber'],
  electrician: ['electrician'],
}

function getTypesForCategory(category: string | null): string[] {
  if (!category) return []
  const normalized = category.toLowerCase().trim().replace(/\s+/g, '_')
  if (CATEGORY_TYPE_MAP[normalized]) return CATEGORY_TYPE_MAP[normalized]
  for (const [key, types] of Object.entries(CATEGORY_TYPE_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return types
  }
  return []
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

async function getPlaceDetailsForExplain(placeId: string): Promise<{
  geometry?: { location: { lat: number; lng: number } }
  name?: string
  types?: string[]
} | null> {
  if (!API_KEY) return null
  const url = new URL(`${PLACES_BASE}/details/json`)
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('key', API_KEY)
  url.searchParams.set(
    'fields',
    'place_id,name,formatted_address,geometry,rating,user_ratings_total,types'
  )
  const res = await fetch(url.toString())
  if (!res.ok) return null
  const data = await res.json()
  if (data.status !== 'OK') return null
  return data.result
}

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('placeId')?.trim()
  const radiusParam = req.nextUrl.searchParams.get('radius')
  const limitParam = req.nextUrl.searchParams.get('limit')
  const categoryParam = req.nextUrl.searchParams.get('category')

  if (!placeId) {
    return NextResponse.json(
      { success: false, error: 'Missing placeId', message: 'Query parameter placeId is required' },
      { status: 400 }
    )
  }

  if (!API_KEY) {
    return NextResponse.json(
      { success: false, error: 'Configuration error', message: 'GOOGLE_PLACES_API_KEY not configured' },
      { status: 503 }
    )
  }

  const radiusMeters = radiusParam ? Math.min(parseInt(radiusParam, 10), 10000) : 8000
  const limitCount = limitParam ? Math.min(parseInt(limitParam, 10), 20) : 10
  const businessCategory = categoryParam ? categoryParam.toLowerCase() : null

  try {
    const targetPlace = await getPlaceDetailsForExplain(placeId)
    if (!targetPlace?.geometry?.location) {
      return NextResponse.json(
        { success: false, error: 'Invalid place', message: 'Target place missing geometry/location' },
        { status: 400 }
      )
    }

    const targetLat = targetPlace.geometry.location.lat
    const targetLng = targetPlace.geometry.location.lng
    const targetName = targetPlace.name || 'Unknown'

    let searchTypes: string[] = []
    let searchTypeFilter: string | null = null

    if (businessCategory) {
      searchTypes = getTypesForCategory(businessCategory)
      searchTypeFilter = searchTypes[0] || null
    } else {
      const primaryType = (targetPlace.types && targetPlace.types[0]) || null
      if (primaryType) {
        searchTypes = [primaryType]
        searchTypeFilter = primaryType
      }
    }

    const nearbyUrl = new URL(`${PLACES_BASE}/nearbysearch/json`)
    nearbyUrl.searchParams.set('location', `${targetLat},${targetLng}`)
    nearbyUrl.searchParams.set('radius', radiusMeters.toString())
    if (searchTypeFilter) nearbyUrl.searchParams.set('type', searchTypeFilter)
    if (businessCategory === 'coffee_shop' || businessCategory === 'cafe') {
      nearbyUrl.searchParams.set('keyword', 'coffee')
    }
    nearbyUrl.searchParams.set('key', API_KEY)

    let nearbyResponse = await fetch(nearbyUrl.toString())
    if (!nearbyResponse.ok) {
      throw new Error(`Places Nearby API HTTP error: ${nearbyResponse.status}`)
    }

    let nearbyData = (await nearbyResponse.json()) as { status: string; results?: unknown[] }
    if (nearbyData.status !== 'OK' && nearbyData.status !== 'ZERO_RESULTS') {
      throw new Error(`Places Nearby API error: ${nearbyData.status}`)
    }

    let nearbyPlaces = nearbyData.results || []

    if (nearbyPlaces.length === 0 && searchTypeFilter && !businessCategory) {
      const fallbackUrl = new URL(`${PLACES_BASE}/nearbysearch/json`)
      fallbackUrl.searchParams.set('location', `${targetLat},${targetLng}`)
      fallbackUrl.searchParams.set('radius', radiusMeters.toString())
      fallbackUrl.searchParams.set('key', API_KEY)
      nearbyResponse = await fetch(fallbackUrl.toString())
      if (nearbyResponse.ok) {
        nearbyData = await nearbyResponse.json() as { status: string; results?: unknown[] }
        if (nearbyData.status === 'OK' || nearbyData.status === 'ZERO_RESULTS') {
          nearbyPlaces = nearbyData.results || []
        }
      }
    }

    const dropCounts = { missingPlaceId: 0, isTarget: 0, missingGeometry: 0, excludedType: 0 }

    const competitors = nearbyPlaces
      .filter((p: { place_id?: string; geometry?: { location?: { lat: number; lng: number } }; types?: string[] }) => {
        if (!p.place_id) {
          dropCounts.missingPlaceId++
          return false
        }
        if (p.place_id === placeId) {
          dropCounts.isTarget++
          return false
        }
        if (!p.geometry?.location) {
          dropCounts.missingGeometry++
          return false
        }
        const placeTypes = (p.types || []) as string[]
        if (placeTypes.some((t) => EXCLUDED_TYPES.includes(t))) {
          dropCounts.excludedType++
          return false
        }
        if (searchTypes.length > 0) {
          const hasRelevantType = placeTypes.some((t) => searchTypes.includes(t))
          if (!hasRelevantType) {
            dropCounts.excludedType++
            return false
          }
        }
        return true
      })
      .slice(0, limitCount)
      .map((p: { place_id: string; name?: string; vicinity?: string; formatted_address?: string; geometry: { location: { lat: number; lng: number } }; rating?: number; user_ratings_total?: number; types?: string[] }) => {
        const competitorLat = p.geometry.location.lat
        const competitorLng = p.geometry.location.lng
        const distanceMeters = haversineDistance(targetLat, targetLng, competitorLat, competitorLng)
        const rating = p.rating ?? null
        const reviews = p.user_ratings_total ?? null
        return {
          placeId: p.place_id,
          name: p.name || 'Unknown Business',
          address: p.vicinity || p.formatted_address || '',
          rating: rating !== null ? Number(rating) : null,
          userRatingsTotal: reviews !== null ? Number(reviews) : null,
          types: p.types || [],
          distanceMeters: Math.round(distanceMeters),
          lat: competitorLat,
          lng: competitorLng,
        }
      })

    return NextResponse.json({
      success: true,
      competitors,
      target: {
        placeId,
        name: targetName,
        lat: targetLat,
        lng: targetLng,
        primaryType: searchTypeFilter || businessCategory || 'establishment',
      },
      radiusMeters,
      count: competitors.length,
    })
  } catch (err) {
    console.error('[Nearby Competitors] Error:', err)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch competitors',
        message: err instanceof Error ? err.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}
