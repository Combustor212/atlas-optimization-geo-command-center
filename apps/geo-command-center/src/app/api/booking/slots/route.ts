import { NextRequest, NextResponse } from 'next/server'
import { fromZonedTime } from 'date-fns-tz'
import { getAvailableSlots } from '@/lib/google/calendar'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const TIMEZONE = 'America/New_York'

/** Generate demo slots (9am–6pm Eastern, 30-min) when Calendar is not configured. */
function getDemoSlots(dateStr: string): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = []
  for (let hour = 9; hour < 18; hour++) {
    for (const min of [0, 30]) {
      const startLocal = fromZonedTime(
        `${dateStr}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`,
        TIMEZONE
      )
      const endLocal = new Date(startLocal.getTime() + 30 * 60 * 1000)
      slots.push({
        start: startLocal.toISOString(),
        end: endLocal.toISOString(),
      })
    }
  }
  return slots
}

/** Resolve agency ID for booking (OAuth token or slug). */
async function getAgencyId(): Promise<string | null> {
  const agencySlug = process.env.AGS_LEADS_AGENCY_SLUG || 'my-agency'
  const supabase = getSupabaseAdmin()
  const { data: tokenRow } = await supabase
    .from('google_calendar_oauth_tokens')
    .select('agency_id')
    .limit(1)
    .maybeSingle()
  if (tokenRow?.agency_id) return tokenRow.agency_id
  const { data: agency } = await supabase
    .from('agencies')
    .select('id')
    .eq('slug', agencySlug)
    .maybeSingle()
  return agency?.id ?? null
}

/** Filter out slots that are in the past. */
function filterPastSlots(slots: { start: string; end: string }[]): { start: string; end: string }[] {
  const now = Date.now()
  return slots.filter((slot) => new Date(slot.end).getTime() > now)
}

/** Filter out slots that overlap with existing bookings. Uses Eastern timezone for day boundaries. */
async function filterBookedSlots(
  slots: { start: string; end: string }[],
  agencyId: string | null,
  dateStr: string
): Promise<{ start: string; end: string }[]> {
  if (!agencyId || slots.length === 0) return slots

  // Use Eastern timezone for day boundaries so we query the correct bookings
  const dayStart = fromZonedTime(`${dateStr}T00:00:00`, TIMEZONE).toISOString()
  const dayEnd = fromZonedTime(`${dateStr}T23:59:59.999`, TIMEZONE).toISOString()

  const supabase = getSupabaseAdmin()
  const { data: bookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('agency_id', agencyId)
    .eq('status', 'scheduled')
    .lte('start_time', dayEnd)
    .gte('end_time', dayStart)

  if (!bookings?.length) return slots

  return slots.filter((slot) => {
    const slotStart = new Date(slot.start).getTime()
    const slotEnd = new Date(slot.end).getTime()
    const overlaps = bookings.some(
      (b) =>
        new Date(b.start_time).getTime() < slotEnd &&
        new Date(b.end_time).getTime() > slotStart
    )
    return !overlaps
  })
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
 * When Google Calendar is not configured, returns demo slots so the UI always shows times.
 */
export async function GET(req: NextRequest) {
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

  const agencyId = await getAgencyId()

  // When agency is not configured, return empty slots to avoid showing unfiltered/unavailable times
  if (!agencyId) {
    return NextResponse.json({ slots: [] }, { headers: CORS_HEADERS })
  }

  try {
    let slots = await getAvailableSlots(dateStr, agencyId)
    slots = await filterBookedSlots(slots, agencyId, dateStr)
    slots = filterPastSlots(slots)
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

    const isNotConfigured =
      msg.includes('GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON') ||
      msg.includes('No Google account connected')
    const isTokenExpired =
      gMsg.includes('invalid_grant') ||
      gMsg.includes('Token has been expired or revoked') ||
      msg.includes('invalid_grant')

    if (isNotConfigured || isTokenExpired) {
      let slots = getDemoSlots(dateStr)
      slots = await filterBookedSlots(slots, agencyId, dateStr)
      slots = filterPastSlots(slots)
      return NextResponse.json({ slots }, { headers: CORS_HEADERS })
    }

    console.error('Booking slots error:', error)
    let slots = getDemoSlots(dateStr)
    slots = await filterBookedSlots(slots, agencyId, dateStr)
    slots = filterPastSlots(slots)
    return NextResponse.json({ slots }, { headers: CORS_HEADERS })
  }
}
