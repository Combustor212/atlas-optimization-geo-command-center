/**
 * GET /api/places/autocomplete?input=XXX
 *
 * Server-side proxy for Google Places Autocomplete.
 * The browser-side Places API key may have referrer restrictions that block
 * atlasgrowths.com requests. This endpoint uses the server-side key (no
 * referrer restrictions) so autocomplete always works in production.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Cache-Control': 'no-store',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const input = searchParams.get('input')?.trim()

  if (!input || input.length < 2) {
    return NextResponse.json({ predictions: [] }, { headers: CORS_HEADERS })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key not configured' },
      { status: 500, headers: CORS_HEADERS }
    )
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
    url.searchParams.set('input', input)
    url.searchParams.set('types', 'establishment')
    url.searchParams.set('key', apiKey)

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { predictions: [], error: `Upstream HTTP ${res.status}` },
        { status: 200, headers: CORS_HEADERS }
      )
    }

    const data = await res.json() as {
      status: string
      predictions?: unknown[]
      error_message?: string
    }

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.warn('[Autocomplete proxy] Google status:', data.status, data.error_message)
      return NextResponse.json(
        { predictions: [], status: data.status },
        { headers: CORS_HEADERS }
      )
    }

    return NextResponse.json(
      { predictions: data.predictions ?? [] },
      { headers: CORS_HEADERS }
    )
  } catch (err) {
    console.error('[Autocomplete proxy] Error:', err)
    return NextResponse.json(
      { predictions: [] },
      { headers: CORS_HEADERS }
    )
  }
}
