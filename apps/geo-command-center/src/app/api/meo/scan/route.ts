/**
 * POST /api/meo/scan - MEO/GEO Scan endpoint (Geo Command Center)
 * Replaces MGO backend for localhost - enables scans without separate backend.
 * MEO: competitor-relative Maps strength. GEO: AI visibility (when OPENAI_API_KEY set).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { runGeoAIVisibility } from '@/lib/geo/aiVisibility'
import { calculateMEOScore } from '@/lib/meo/mgo/meoEngine'
import type { PlaceDetails } from '@/lib/meo/mgo/meoEngine'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
}

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY
const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place'

async function findPlaceFromText(query: string): Promise<string | null> {
  if (!API_KEY) return null
  const url = new URL(`${PLACES_BASE}/findplacefromtext/json`)
  url.searchParams.set('input', query)
  url.searchParams.set('inputtype', 'textquery')
  url.searchParams.set('fields', 'place_id,name,formatted_address')
  url.searchParams.set('key', API_KEY)
  const res = await fetch(url.toString())
  if (!res.ok) return null
  const data = await res.json()
  if (data.status === 'OK' && data.candidates?.[0]) {
    return data.candidates[0].place_id
  }
  return null
}

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

/** Map Geo getPlaceDetails result (Record<string, unknown>) to PlaceDetails format */
function mapToPlaceDetails(raw: Record<string, unknown>): PlaceDetails {
  const geo = raw.geometry as { location?: { lat: number; lng: number } } | undefined
  const openingHours = raw.opening_hours as { weekday_text?: string[] } | undefined
  const photos = (raw.photos as unknown[]) || []
  return {
    place_id: String(raw.place_id ?? ''),
    name: raw.name as string | undefined,
    formatted_address: raw.formatted_address as string | undefined,
    geometry: geo?.location
      ? { location: { lat: geo.location.lat, lng: geo.location.lng } }
      : undefined,
    website: raw.website as string | undefined,
    rating: typeof raw.rating === 'number' ? raw.rating : undefined,
    user_ratings_total:
      typeof raw.user_ratings_total === 'number' ? raw.user_ratings_total : undefined,
    opening_hours: openingHours?.weekday_text
      ? { weekday_text: openingHours.weekday_text }
      : undefined,
    photos: photos.map((p) =>
      typeof p === 'object' && p && 'photo_reference' in p
        ? { photo_reference: (p as { photo_reference?: string }).photo_reference }
        : {}
    ),
    types: Array.isArray(raw.types) ? (raw.types as string[]) : undefined,
    formatted_phone_number: raw.formatted_phone_number as string | undefined,
    international_phone_number: raw.international_phone_number as string | undefined,
  }
}

/** Fallback MEO when competitor discovery fails */
function computeMEOScoreFallback(place: Record<string, unknown>): number {
  let score = 40
  if (place.formatted_address) score += 15
  if (place.formatted_phone_number || place.international_phone_number) score += 15
  if (place.website) score += 15
  if (place.rating) score += 5
  if (place.user_ratings_total && Number(place.user_ratings_total) >= 10) score += 5
  if (place.opening_hours) score += 5
  if (place.photos && (place.photos as unknown[]).length >= 5) score += 5
  return Math.min(100, score)
}

function computeSEOScore(place: Record<string, unknown>): number {
  let score = 35
  if (place.website) score += 25
  if (place.editorial_summary) score += 15
  if (place.opening_hours) score += 8
  if (place.formatted_phone_number || place.international_phone_number) score += 7
  return Math.min(100, score)
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  const start = Date.now()
  try {
    const body = await req.json()
    const businessName = body.businessName || body.business_name || ''
    const location = body.location || ''
    let placeId = body.place_id

    if (!businessName && !placeId) {
      return NextResponse.json({ error: 'businessName or place_id required' }, { status: 400, headers: CORS_HEADERS })
    }

    if (!placeId) {
      const query = `${businessName}, ${location}`.trim()
      placeId = await findPlaceFromText(query)
      if (!placeId) {
        return NextResponse.json({
          error: 'Place not found',
          message: `Could not find: ${query}`,
        }, { status: 404, headers: CORS_HEADERS })
      }
    }

    const place = await getPlaceDetails(placeId)
    if (!place) {
      return NextResponse.json({
        error: 'Place details not found',
        details: { place_id: placeId },
      }, { status: 404, headers: CORS_HEADERS })
    }

    const locationStr = `${body.location || ''}`.trim() || (place.formatted_address as string) || ''
    let meoScore: number
    let meoExplain: Awaited<ReturnType<typeof calculateMEOScore>>['body'] | null = null
    if (API_KEY) {
      try {
        const placeDetails = mapToPlaceDetails(place)
        const meoResult = await calculateMEOScore(businessName, locationStr, placeDetails)
        if (meoResult.body.status === 'error') {
          return NextResponse.json(
            {
              error: 'MEO scoring failed',
              message: meoResult.body.gradeRationale || 'Unknown error',
            },
            { status: 400, headers: CORS_HEADERS }
          )
        }
        meoScore = meoResult.body.meoScore
        meoExplain = meoResult.body
      } catch (err) {
        console.error('[MEO Scan] MEO scoring failed:', err)
        meoScore = computeMEOScoreFallback(place)
      }
    } else {
      meoScore = computeMEOScoreFallback(place)
    }
    const seoScore = computeSEOScore(place)
    let geoScore = Math.round((meoScore + seoScore) / 2)
    let geoExplain: Awaited<ReturnType<typeof runGeoAIVisibility>> = null

    // Run GEO AI visibility (10-20 ChatGPT prompts) when OPENAI_API_KEY is set
    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey) {
      try {
        geoExplain = await runGeoAIVisibility(place, locationStr, openaiKey)
        if (geoExplain) {
          geoScore = geoExplain.geoScore
        }
      } catch (err) {
        console.error('[MEO Scan] GEO AI visibility failed:', err)
      }
    }

    const overall = Math.round((meoScore * 0.4 + seoScore * 0.3 + geoScore * 0.3))

    // Build full scan report for admin view (exact report the company sees, unblurred)
    const scanReport = {
      scores: { meo: meoScore, seo: seoScore, geo: geoScore, overall, final: overall },
      geo: {
        score: geoScore,
        status: 'ok',
        category: { key: geoExplain?.nicheLabel?.replace(/\s+/g, '_') || 'local', label: geoExplain?.nicheLabel || 'Local Business' },
        confidence: 0.8,
        explainJobId: null,
        algoVersion: 'geo-v5',
        explain: geoExplain ?? undefined,
      },
      body: meoExplain ?? {
        gbpFacts: { completenessScore: seoScore },
        meoInputsUsed: {},
        debugStamp: new Date().toISOString(),
      },
      place: {
        place_id: place.place_id,
        name: place.name,
        formatted_address: place.formatted_address,
        formatted_phone_number: place.formatted_phone_number,
        international_phone_number: place.international_phone_number,
        website: place.website,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        opening_hours: place.opening_hours,
        types: place.types,
      },
    }

    // Forward lead to Supabase for every scan when email/phone provided
    let leadForwardStatus: string | undefined
    const email = (body.email as string)?.trim() || ''
    const phone = (body.phone as string)?.trim() || ''
    if (email || phone) {
      try {
        const agencySlug = process.env.AGS_LEADS_AGENCY_SLUG || 'my-agency'
        const admin = getSupabaseAdmin()
        const { data: agency } = await admin.from('agencies').select('id').eq('slug', agencySlug).single()
        if (agency) {
          await admin.from('leads').insert({
            agency_id: agency.id,
            source: 'scan',
            name: businessName || (place.name as string),
            email: email || 'scan@lead.local',
            phone: phone || null,
            business_name: businessName || (place.name as string),
            metadata: {
              meo_score: meoScore,
              geo_score: geoScore,
              overall_score: overall,
              meoScore,
              geoScore,
              overallScore: overall,
              address: place.formatted_address,
              place_id: placeId,
              city: (body.city as string) || undefined,
              state: (body.state as string) || undefined,
              zipCode: (body.zipCode as string) || undefined,
              country: (body.country as string) || undefined,
              website: (place.website as string) || undefined,
              scanReport,
            },
          })
          leadForwardStatus = 'forwarded'
        }
      } catch (err) {
        console.error('[MEO Scan] Lead insert failed:', err)
        leadForwardStatus = 'error'
      }
    }

    const processingTimeMs = Date.now() - start
    return NextResponse.json(
      {
        success: true,
        scanVersion: 'scan-v1.0',
        geoAlgoVersion: 'geo-v5',
        scores: { meo: meoScore, seo: seoScore, geo: geoScore, overall, final: overall },
        geo: {
          score: geoScore,
          status: 'ok',
          category: { key: geoExplain?.nicheLabel?.replace(/\s+/g, '_') || 'local', label: geoExplain?.nicheLabel || 'Local Business' },
          confidence: 0.8,
          explainJobId: null,
          algoVersion: 'geo-v5',
          explain: geoExplain ?? undefined,
        },
        body: meoExplain ?? {
          gbpFacts: { completenessScore: seoScore },
          meoInputsUsed: {},
          debugStamp: new Date().toISOString(),
        },
        meta: {
          processingTimeMs,
          scanStatus: 'complete',
          leadForwardStatus,
        },
        // Place details for frontend when it called without place_id (backend-only lookup)
        place: {
          place_id: place.place_id,
          name: place.name,
          formatted_address: place.formatted_address,
          formatted_phone_number: place.formatted_phone_number,
          international_phone_number: place.international_phone_number,
          website: place.website,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
          opening_hours: place.opening_hours,
          types: place.types,
        },
      },
      { headers: CORS_HEADERS }
    )
  } catch (err) {
    console.error('[MEO Scan] Error:', err)
    return NextResponse.json(
      { error: 'Scan failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
