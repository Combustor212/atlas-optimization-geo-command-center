/**
 * GET /api/meo/explain?placeId=...&force=1
 *
 * MEO Maps insights - MGO backend compatible.
 * Returns UI-ready format for MEOScoreWhyPanel.
 */
import { NextRequest, NextResponse } from 'next/server'
import { calculateMEOScore } from '@/lib/meo/mgo/meoEngine'
import type { PlaceDetails } from '@/lib/meo/mgo/meoEngine'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY
const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place'

async function getPlaceDetails(placeId: string): Promise<Record<string, unknown> | null> {
  if (!API_KEY) return null
  const url = new URL(`${PLACES_BASE}/details/json`)
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('key', API_KEY)
  url.searchParams.set(
    'fields',
    'place_id,name,formatted_address,formatted_phone_number,international_phone_number,website,geometry,rating,user_ratings_total,opening_hours,photos,types,editorial_summary'
  )
  const res = await fetch(url.toString())
  if (!res.ok) return null
  const data = await res.json()
  if (data.status !== 'OK') return null
  return data.result
}

function mapToPlaceDetails(raw: Record<string, unknown>): PlaceDetails {
  const geo = raw.geometry as { location?: { lat: number; lng: number } } | undefined
  const openingHours = raw.opening_hours as { weekday_text?: string[] } | undefined
  const photos = (raw.photos as unknown[]) || []
  return {
    place_id: String(raw.place_id ?? ''),
    name: raw.name as string | undefined,
    formatted_address: raw.formatted_address as string | undefined,
    geometry: geo?.location ? { location: { lat: geo.location.lat, lng: geo.location.lng } } : undefined,
    website: raw.website as string | undefined,
    rating: typeof raw.rating === 'number' ? raw.rating : undefined,
    user_ratings_total: typeof raw.user_ratings_total === 'number' ? raw.user_ratings_total : undefined,
    opening_hours: openingHours?.weekday_text ? { weekday_text: openingHours.weekday_text } : undefined,
    photos: photos.map((p) =>
      typeof p === 'object' && p && 'photo_reference' in p ? { photo_reference: (p as { photo_reference?: string }).photo_reference } : {}
    ),
    types: Array.isArray(raw.types) ? (raw.types as string[]) : undefined,
    formatted_phone_number: raw.formatted_phone_number as string | undefined,
    international_phone_number: raw.international_phone_number as string | undefined,
  }
}

function buildExplainFromMGOBody(meoBody: Awaited<ReturnType<typeof calculateMEOScore>>['body']): Record<string, unknown> {
  if (!meoBody || meoBody.status === 'error') {
    return {
      score: { current: 0 },
      marketContext: {},
      gbpFacts: {},
      drivers: [],
      helped: [],
      heldBack: [],
      actions: [],
      reliabilityCap: { enabled: false, capValue: null, reason: null },
      potential: { enabled: false, potentialScore: null, basis: '' },
      lastRefreshedAt: new Date().toISOString(),
    }
  }

  const mc = meoBody.marketContext
  const cp = mc?.competitivePercentile ?? { rating: 50, reviews: 50, photos: 50 }
  const competitivePercentile = { rating: cp.rating ?? 50, reviews: cp.reviews ?? 50, photos: cp.photos ?? 50 }
  const avgPercentile = Math.round((competitivePercentile.rating + competitivePercentile.reviews + competitivePercentile.photos) / 3)
  const marketPosition = mc?.marketPosition ?? (avgPercentile >= 70 ? 'Top performer' : avgPercentile >= 50 ? 'Above average' : 'Room to improve')

  const drivers: Array<{ id: string; title: string; status: string; why: string; impactLabel: string }> = []
  for (const d of meoBody.deficiencies || []) {
    drivers.push({ id: 'deficiency_' + d.toLowerCase().replace(/\s+/g, '_').slice(0, 20), title: d, status: 'warn', why: d, impactLabel: '—' })
  }
  if (meoBody.hasWebsite) drivers.push({ id: 'website', title: 'Website', status: 'good', why: 'Website listed improves visibility.', impactLabel: '—' })
  if (meoBody.hasPhone) drivers.push({ id: 'phone', title: 'Phone', status: 'good', why: 'Phone number helps customers contact you.', impactLabel: '—' })
  if (meoBody.hasHours) drivers.push({ id: 'hours', title: 'Opening hours', status: 'good', why: 'Hours help customers plan visits.', impactLabel: '—' })

  const helped = drivers.filter((d) => d.status === 'good').map((d) => d.title)
  const heldBack = drivers.filter((d) => d.status === 'warn' || d.status === 'bad').map((d) => d.title)

  const actions = (meoBody.optimizationTips || []).map((tip, i) => ({
    id: `action_${i}`,
    title: tip,
    description: tip,
    pointGain: null,
    timeEstimate: '—',
    cta: { label: 'Learn more', action: 'complete_profile' as const },
  }))

  return {
    score: { current: meoBody.meoScore },
    marketContext: {
      competitivePercentile,
      localAvgRating: mc?.localAvgRating ?? null,
      localAvgReviews: mc?.localAvgReviews ?? null,
      localAvgPhotos: mc?.localAvgPhotos ?? null,
      marketPosition,
    },
    gbpFacts: {
      rating: meoBody.rating ?? null,
      totalReviews: meoBody.totalReviews ?? null,
      photoCount: meoBody.photoCount ?? 0,
      isFranchise: meoBody.isFranchise ?? false,
    },
    drivers,
    helped,
    heldBack,
    actions,
    reliabilityCap: { enabled: false, capValue: null, reason: null },
    potential: { enabled: false, potentialScore: null, basis: '' },
    lastRefreshedAt: new Date().toISOString(),
  }
}

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('placeId')?.trim()

  if (!placeId) {
    return NextResponse.json(
      { error: 'Validation failed', message: 'Missing required query parameter: placeId' },
      { status: 400 }
    )
  }

  if (!API_KEY) {
    return NextResponse.json(
      { error: 'Configuration error', message: 'Google Places API key not configured' },
      { status: 503 }
    )
  }

  try {
    const place = await getPlaceDetails(placeId)
    if (!place) {
      return NextResponse.json(
        { error: 'Place not found', message: `Could not fetch details for place_id: ${placeId}` },
        { status: 404 }
      )
    }

    const placeDetails = mapToPlaceDetails(place)
    const locationStr = (place.formatted_address as string) || ''
    const businessName = (place.name as string) || 'Unknown'
    const meoResult = await calculateMEOScore(businessName, locationStr, placeDetails)
    if (meoResult.body.status === 'error') {
      return NextResponse.json(
        { error: 'MEO scoring failed', message: meoResult.body.gradeRationale },
        { status: 400 }
      )
    }
    const data = buildExplainFromMGOBody(meoResult.body)

    return NextResponse.json(
      { data, meta: { cacheHit: false } },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    )
  } catch (err) {
    console.error('[MEO Explain] Error:', err)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}
