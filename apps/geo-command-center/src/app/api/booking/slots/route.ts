import { NextRequest, NextResponse } from 'next/server'
import { getAvailableSlots } from '@/lib/google/calendar'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

/**
 * OPTIONS /api/booking/slots - CORS preflight
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

/**
 * GET /api/booking/slots?date=2025-02-26
 * Returns available 30-min slots for the given date (business hours 9am-6pm EST).
 * Public endpoint - no auth required for booking.
 */
export async function GET(req: NextRequest) {
  try {
    const dateStr = req.nextUrl.searchParams.get('date')
    if (!dateStr) {
      return NextResponse.json(
        { error: 'Missing required query param: date (YYYY-MM-DD)' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const match = /^\d{4}-\d{2}-\d{2}$/.exec(dateStr)
    if (!match) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const agencySlug = process.env.AGS_LEADS_AGENCY_SLUG || 'my-agency'
    const supabase = getSupabaseAdmin()

    // Prefer agency with Google Calendar tokens (connected); fallback to agency by slug
    let agencyId: string | null = null
    const { data: tokenRow } = await supabase
      .from('google_calendar_oauth_tokens')
      .select('agency_id')
      .limit(1)
      .maybeSingle()

    if (tokenRow?.agency_id) {
      agencyId = tokenRow.agency_id
    } else {
      const { data: agency } = await supabase
        .from('agencies')
        .select('id')
        .eq('slug', agencySlug)
        .maybeSingle()
      agencyId = agency?.id ?? null
    }

    const slots = await getAvailableSlots(dateStr, agencyId)
    return NextResponse.json({ slots }, { headers: CORS_HEADERS })
  } catch (error) {
    const msg = String(error instanceof Error ? error.message : 'Unknown error')
    const gError = error && typeof error === 'object' && 'response' in error
      ? (error as { response?: { data?: { error?: unknown } } }).response
      : null
    const gMsg = typeof gError?.data?.error === 'string'
      ? gError.data.error
      : typeof gError?.data?.error === 'object' && gError.data.error && 'message' in gError.data.error
        ? String((gError.data.error as { message?: string }).message)
        : msg

    if (
      msg.includes('GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON') ||
      msg.includes('No Google account connected')
    ) {
      return NextResponse.json(
        { error: 'Booking is not configured' },
        { status: 503, headers: CORS_HEADERS }
      )
    }
    // Token invalid/revoked - suggest reconnecting
    if (
      gMsg.includes('invalid_grant') ||
      gMsg.includes('Token has been expired or revoked') ||
      msg.includes('invalid_grant')
    ) {
      return NextResponse.json(
        { error: 'Google Calendar access expired. Reconnect in Settings.' },
        { status: 503, headers: CORS_HEADERS }
      )
    }
    console.error('Booking slots error:', error)
    const detail = process.env.NODE_ENV === 'development' ? (gMsg || msg) : undefined
    return NextResponse.json(
      { error: 'Failed to fetch available slots', ...(detail && { detail }) },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
