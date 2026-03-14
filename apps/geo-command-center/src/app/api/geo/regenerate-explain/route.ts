/**
 * POST /api/geo/regenerate-explain
 * Geo Command Center: Run GEO AI visibility sync (no job/polling).
 * Returns geo with explain directly for Retry flow.
 */
import { NextRequest, NextResponse } from 'next/server'
import { runGeoAIVisibility } from '@/lib/geo/aiVisibility'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
}

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY
const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place'

async function getPlaceDetails(placeId: string): Promise<Record<string, unknown> | null> {
  if (!API_KEY) return null
  const url = new URL(`${PLACES_BASE}/details/json`)
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('key', API_KEY)
  url.searchParams.set('fields', 'place_id,name,formatted_address,formatted_phone_number,international_phone_number,website,geometry,rating,user_ratings_total,opening_hours,photos,types,editorial_summary')
  const res = await fetch(url.toString())
  if (!res.ok) return null
  const data = await res.json()
  if (data.status !== 'OK') return null
  return data.result
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const placeId = body.placeId
    const locationLabel = body.locationLabel || body.location || ''

    if (!placeId) {
      return NextResponse.json({ error: 'placeId required' }, { status: 400, headers: CORS_HEADERS })
    }

    const place = await getPlaceDetails(placeId)
    if (!place) {
      return NextResponse.json({ error: 'Place details not found' }, { status: 404, headers: CORS_HEADERS })
    }

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json({
        error: 'GEO analysis unavailable',
        message: 'OPENAI_API_KEY not configured',
      }, { status: 503, headers: CORS_HEADERS })
    }

    const locationStr = String(locationLabel).trim() || (place.formatted_address as string) || ''
    const geoExplain = await runGeoAIVisibility(place, locationStr, openaiKey)

    if (!geoExplain) {
      return NextResponse.json({
        error: 'GEO analysis failed',
        message: 'Could not generate explain',
      }, { status: 500, headers: CORS_HEADERS })
    }

    return NextResponse.json(
      {
        geo: {
          score: geoExplain.geoScore,
          status: 'ok',
          explain: geoExplain,
          explainJobId: null,
          category: { key: 'local', label: geoExplain.nicheLabel || 'Local Business' },
        },
      },
      { headers: CORS_HEADERS }
    )
  } catch (err) {
    console.error('[regenerate-explain] Error:', err)
    return NextResponse.json(
      { error: 'GEO failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
