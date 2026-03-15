/**
 * POST /api/geo/refresh
 * Force a fresh GEO benchmark (bypasses cache) - MGO backend compatible.
 * Body: { placeId: string, radius?: number }
 */
import { NextRequest, NextResponse } from 'next/server'
import { runGeoAIVisibility } from '@/lib/geo/aiVisibility'

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

function mapExplainToBenchmarkFormat(explain: Awaited<ReturnType<typeof runGeoAIVisibility>>, placeId: string) {
  if (!explain) return null

  const queries = explain.queries || []
  const topQueryWins = queries
    .filter((q) => q.mentioned && q.rank != null && q.rank <= 3)
    .slice(0, 5)
    .map((q) => ({
      query: q.query,
      bucket: q.bucket || 'best',
      weight: 1,
      targetRank: q.rank,
      targetInTop5: true,
      top5: [],
      confidence: 0.8,
      missingDataFlags: [] as string[],
      auditPassed: true,
      timestamp: new Date().toISOString(),
    }))

  const topQueryLosses = queries
    .filter((q) => !q.mentioned || (q.rank != null && q.rank > 5))
    .slice(0, 5)
    .map((q) => ({
      query: q.query,
      bucket: q.bucket || 'near_me',
      weight: 1,
      targetRank: q.rank,
      targetInTop5: false,
      top5: [],
      confidence: 0.7,
      missingDataFlags: [] as string[],
      auditPassed: true,
      timestamp: new Date().toISOString(),
    }))

  const drivers = (explain.components || []).map((c) => ({
    id: c.name.toLowerCase().replace(/\s+/g, '_'),
    title: c.label || c.name,
    status: (c.score / (c.max || 1) >= 0.7 ? 'good' : c.score / (c.max || 1) >= 0.4 ? 'warn' : 'bad') as 'good' | 'warn' | 'bad',
    observedValue: `${c.score}/${c.max}`,
    competitorMedian: null as string | number | null,
    explanation: c.label || '',
    impactLabel: '—',
    pointGain: 0,
    cta: '',
  }))

  return {
    target: { placeId, name: '', address: '', lat: 0, lng: 0, distanceMeters: 0, rating: 0, reviewCount: 0, photoCount: 0, hasWebsite: false, hasPhone: false, hasHours: false, types: [] },
    competitors: [] as unknown[],
    niche: explain.nicheLabel || 'Local Business',
    nicheLabel: explain.nicheLabel || 'Local Business',
    nicheCanonical: (explain.nicheLabel || 'local').replace(/\s+/g, '_'),
    locationLabel: explain.locationLabel || '',
    radiusMeters: 5000,
    category: { key: (explain.nicheLabel || 'local').replace(/\s+/g, '_'), label: explain.nicheLabel || 'Local Business', confidence: 0.8, source: 'places' as const },
    queries: queries.map((q) => ({ query: q.query, bucket: (q.bucket as string) || 'best', weight: 1 })),
    rankResults: [] as unknown[],
    geoScore: explain.geoScore,
    geoAlgoVersion: 'geo-v5',
    geoCalibrated: false,
    percentile: explain.percentile ?? 50,
    scoreBreakdown: {
      sovTop3: 0,
      sovTop5: 0,
      evidenceStrengthIndex: (explain.entityStrengthScore ?? 50) / 100,
      rawScore: explain.geoScore,
      finalScore: explain.geoScore,
      reliabilityCap: null,
      wasCapped: false,
      capReason: null,
    },
    drivers,
    fixFirst: (explain.optimizationRecommendations || []).slice(0, 5).map((rec, i) => ({
      id: `fix_${i}`,
      title: rec.slice(0, 50),
      description: rec,
      pointGain: 5,
      timeEstimate: '~30 min',
      cta: 'Learn more',
    })),
    topQueryWins,
    topQueryLosses,
    uncertainQueries: [] as unknown[],
    confidence: ((explain.entityStrengthScore ?? 50) >= 70 ? 'high' : (explain.entityStrengthScore ?? 50) >= 50 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
    confidenceReasons: explain.optimizationRecommendations?.slice(0, 3) || ['AI visibility analysis complete'],
    geoStatus: 'valid' as const,
    lastRefreshedAt: new Date().toISOString(),
    cacheKey: `geo:${placeId}:r5000`,
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await req.json()
    const placeId = body.placeId
    const radius = body.radius

    if (!placeId || typeof placeId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid placeId', message: 'placeId is required in request body', details: { received: placeId } },
        { status: 400 }
      )
    }

    const radiusMeters = radius ? parseInt(String(radius), 10) : 5000
    if (isNaN(radiusMeters) || radiusMeters < 1000 || radiusMeters > 50000) {
      return NextResponse.json(
        { error: 'Invalid radius', message: 'radius must be between 1000 and 50000 meters', details: { received: radius } },
        { status: 400 }
      )
    }

    const place = await getPlaceDetails(placeId)
    if (!place) {
      return NextResponse.json(
        { error: 'Place details not found', details: { place_id: placeId } },
        { status: 404 }
      )
    }

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json(
        {
          error: 'Insufficient competitors',
          code: 'INSUFFICIENT_COMPETITORS',
          message: 'GEO refresh requires OPENAI_API_KEY.',
          details: { count: 0, required: 8 },
        },
        { status: 503 }
      )
    }

    const locationStr = (place.formatted_address as string) || ''
    const geoExplain = await runGeoAIVisibility(place, locationStr, openaiKey)

    const result = mapExplainToBenchmarkFormat(geoExplain, placeId)
    if (!result) {
      return NextResponse.json(
        {
          error: 'Insufficient competitors',
          code: 'INSUFFICIENT_COMPETITORS',
          message: 'Could not generate GEO benchmark',
          details: { count: 0, required: 8 },
        },
        { status: 503 }
      )
    }

    const totalTime = Date.now() - startTime

    return NextResponse.json(
      {
        ...result,
        meta: {
          processingTimeMs: totalTime,
          timestamp: new Date().toISOString(),
          refreshed: true,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    )
  } catch (err) {
    console.error('[GEO Refresh] Error:', err)
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'UNKNOWN',
        message: err instanceof Error ? err.message : 'Unknown error occurred',
        details: { timestamp: new Date().toISOString() },
      },
      { status: 500 }
    )
  }
}
