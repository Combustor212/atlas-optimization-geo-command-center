/**
 * POST /api/scan — Public standalone scan endpoint
 *
 * Simplified interface for the /scan-results page and campaigns.
 * Runs the same real MEO + GEO scoring as /api/meo/scan, then fires
 * both Resend emails (user + admin) and returns a clean payload.
 *
 * Input:  { businessName, email, placeId?, address?, city?, state?, country?, phone? }
 * Output: { success, results: { meo, geo, overall, insight, businessName, address } }
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { calculateMEOScore } from '@/lib/meo/mgo/meoEngine'
import type { PlaceDetails } from '@/lib/meo/mgo/meoEngine'
import { runGeoAIVisibility } from '@/lib/geo/aiVisibility'
import { fireScanEmails } from '@/lib/email/scanEmails'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
}

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY
const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place'
const BOOKING_URL = process.env.NEXT_PUBLIC_BOOKING_URL || 'https://atlasgrowths.com/get-support?book=1'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://admin.atlasgrowths.com'

// ─── Google Places helpers ────────────────────────────────────────────────────

async function resolvePlace(placeId: string): Promise<Record<string, unknown> | null> {
  if (!API_KEY) return null
  const url = new URL(`${PLACES_BASE}/details/json`)
  url.searchParams.set('place_id', placeId)
  url.searchParams.set(
    'fields',
    'place_id,name,formatted_address,geometry,website,rating,user_ratings_total,opening_hours,photos,types,formatted_phone_number,international_phone_number'
  )
  url.searchParams.set('key', API_KEY)
  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    const json = await res.json()
    return json.status === 'OK' ? json.result : null
  } catch {
    return null
  }
}

async function findPlace(query: string): Promise<string | null> {
  if (!API_KEY) return null
  const url = new URL(`${PLACES_BASE}/findplacefromtext/json`)
  url.searchParams.set('input', query)
  url.searchParams.set('inputtype', 'textquery')
  url.searchParams.set('fields', 'place_id')
  url.searchParams.set('key', API_KEY)
  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    const json = await res.json()
    return json.status === 'OK' ? json.candidates?.[0]?.place_id ?? null : null
  } catch {
    return null
  }
}

function toPlaceDetails(raw: Record<string, unknown>): PlaceDetails {
  const geo = raw.geometry as { location?: { lat: number; lng: number } } | undefined
  const photos = (raw.photos as unknown[]) || []
  return {
    place_id: String(raw.place_id ?? ''),
    name: raw.name as string | undefined,
    formatted_address: raw.formatted_address as string | undefined,
    geometry: geo?.location ? { location: geo.location } : undefined,
    website: raw.website as string | undefined,
    rating: typeof raw.rating === 'number' ? raw.rating : undefined,
    user_ratings_total: typeof raw.user_ratings_total === 'number' ? raw.user_ratings_total : undefined,
    opening_hours:
      (raw.opening_hours as { weekday_text?: string[] })?.weekday_text
        ? { weekday_text: (raw.opening_hours as { weekday_text: string[] }).weekday_text }
        : undefined,
    photos: photos.map((p) =>
      typeof p === 'object' && p && 'photo_reference' in p
        ? { photo_reference: (p as { photo_reference?: string }).photo_reference }
        : { photo_reference: 'unknown' }
    ),
    types: Array.isArray(raw.types) ? (raw.types as string[]) : undefined,
    formatted_phone_number: raw.formatted_phone_number as string | undefined,
    international_phone_number: raw.international_phone_number as string | undefined,
  }
}

// ─── Insight generator ────────────────────────────────────────────────────────

function generateInsight(meo: number, geo: number | null, businessName: string): string {
  const g = geo ?? meo
  const overall = Math.round((meo + g) / 2)
  if (overall >= 75) {
    return `${businessName} has a strong local and AI search presence. With targeted optimizations, you can pull further ahead of competitors and capture more discovery traffic.`
  }
  if (overall >= 50) {
    return `${businessName} shows a solid foundation but has meaningful visibility gaps. Competitors with higher review volume and richer content are likely outranking you in Maps and AI answers.`
  }
  return `${businessName} is largely invisible in local and AI search. A focused visibility strategy could dramatically increase discovery traffic and inbound leads within 60–90 days.`
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS })
}

export async function POST(req: NextRequest) {
  const start = Date.now()

  try {
    const body = await req.json().catch(() => ({}))
    const businessName = (body.businessName as string)?.trim() || ''
    const email = (body.email as string)?.trim() || ''
    const phone = (body.phone as string)?.trim() || undefined
    const city = (body.city as string)?.trim() || undefined
    const state = (body.state as string)?.trim() || undefined
    const country = (body.country as string)?.trim() || undefined
    const address = (body.address as string)?.trim() || undefined

    // ── Validation ────────────────────────────────────────────────────────────
    if (!businessName) {
      return NextResponse.json({ error: 'businessName is required' }, { status: 400, headers: CORS })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400, headers: CORS })
    }

    // ── Resolve place ─────────────────────────────────────────────────────────
    let placeId = (body.placeId as string)?.trim() || null
    if (!placeId) {
      const query = [businessName, city, state, country].filter(Boolean).join(', ')
      placeId = await findPlace(query)
    }

    let placeDetails: PlaceDetails | null = null
    if (placeId) {
      const raw = await resolvePlace(placeId)
      if (raw) placeDetails = toPlaceDetails(raw)
    }

    if (!placeDetails) {
      // Fallback minimal details for scoring
      placeDetails = {
        place_id: placeId ?? `manual_${Date.now()}`,
        name: businessName,
        formatted_address: [address, city, state, country].filter(Boolean).join(', ') || undefined,
        photos: [],
      }
    }

    // ── MEO Scoring ───────────────────────────────────────────────────────────
    let meoScore = 50
    let meoWhyList: string[] = []
    try {
      const location = [city, state].filter(Boolean).join(', ') || country || ''
      const meoResult = await calculateMEOScore(placeDetails, location)
      meoScore = Math.max(0, Math.min(100, Math.round(meoResult.score)))
      meoWhyList = meoResult.why ?? []
    } catch (e) {
      console.error('[/api/scan] MEO scoring error:', e)
    }

    // ── GEO Scoring ───────────────────────────────────────────────────────────
    let geoScore: number | null = null
    let geoInsight: string | null = null
    try {
      const location = [city, state].filter(Boolean).join(', ') || country || 'Unknown'
      const geoResult = await runGeoAIVisibility({
        businessName,
        location,
        placeId: placeDetails.place_id,
        category: placeDetails.types?.[0] || 'local_business',
      })
      if (geoResult && typeof geoResult.score === 'number') {
        geoScore = Math.max(0, Math.min(100, Math.round(geoResult.score)))
        geoInsight = geoResult.explain?.summary ?? null
      }
    } catch (e) {
      console.error('[/api/scan] GEO scoring error:', e)
    }

    const overall = Math.round(
      geoScore !== null ? (meoScore + geoScore) / 2 : meoScore
    )

    const insight = geoInsight || generateInsight(meoScore, geoScore, businessName)

    // ── Scan results URL (encode minimal data for the scan-results page) ───────
    const resultPayload = encodeURIComponent(
      JSON.stringify({
        meo: meoScore,
        geo: geoScore ?? overall,
        overall,
        insight,
        businessName: placeDetails.name || businessName,
        address: placeDetails.formatted_address || address || '',
      })
    )
    const scanResultsUrl = `${APP_URL}/scan-results?data=${resultPayload}`

    // ── Emails (non-blocking) ─────────────────────────────────────────────────
    fireScanEmails({
      businessName: placeDetails.name || businessName,
      email,
      phone,
      address: placeDetails.formatted_address || address,
      city,
      state,
      country,
      meoScore,
      geoScore,
      overallScore: overall,
      insight,
      scanResultsUrl,
      bookingUrl: BOOKING_URL,
    })

    console.log(`[/api/scan] Complete in ${Date.now() - start}ms — MEO ${meoScore} GEO ${geoScore} Overall ${overall}`)

    return NextResponse.json(
      {
        success: true,
        results: {
          meo: meoScore,
          geo: geoScore ?? overall,
          overall,
          insight,
          businessName: placeDetails.name || businessName,
          address: placeDetails.formatted_address || address || '',
        },
      },
      { headers: CORS }
    )
  } catch (err) {
    console.error('[/api/scan] Fatal error:', err)
    return NextResponse.json(
      { error: 'Scan failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500, headers: CORS }
    )
  }
}
