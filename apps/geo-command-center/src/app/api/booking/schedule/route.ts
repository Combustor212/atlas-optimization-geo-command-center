import { NextRequest, NextResponse } from 'next/server'
import {
  createBookingEvent,
  hasExistingBooking,
} from '@/lib/google/calendar'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const MAX_SLOT_MS = 120 * 60 * 1000 // 2 hours max

/** Basic email format validation */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * OPTIONS /api/booking/schedule - CORS preflight
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

/**
 * POST /api/booking/schedule
 * Creates a calendar event with Google Meet and records the lead + booking.
 * Public endpoint - no auth required for booking.
 *
 * Input: name, email, phone, slotStart, slotEnd (optional: business, message)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = (body.name as string)?.trim()
    const email = (body.email as string)?.trim()
    const phone = (body.phone as string)?.trim()
    const slotStart = body.slotStart as string
    const slotEnd = body.slotEnd as string

    if (!name || !email || !phone || !slotStart || !slotEnd) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, email, phone, slotStart, slotEnd',
        },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const start = new Date(slotStart)
    const end = new Date(slotEnd)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid time range. Use ISO 8601 format.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }
    if (start >= end) {
      return NextResponse.json(
        { success: false, error: 'Invalid time range: start must be before end.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }
    const now = new Date()
    if (start < now) {
      return NextResponse.json(
        { success: false, error: 'Cannot book a slot in the past.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }
    const durationMs = end.getTime() - start.getTime()
    if (durationMs > MAX_SLOT_MS) {
      return NextResponse.json(
        { success: false, error: 'Invalid time range: slot duration exceeds 2 hours.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const agencySlug = process.env.AGS_LEADS_AGENCY_SLUG || 'my-agency'
    const supabase = getSupabaseAdmin()

    // Prefer agency with Google Calendar tokens; fallback to agency by slug
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

    if (!agencyId) {
      return NextResponse.json(
        { success: false, error: 'Agency not configured' },
        { status: 503, headers: CORS_HEADERS }
      )
    }

    const alreadyBooked = await hasExistingBooking(
      agencyId,
      slotStart,
      slotEnd
    )
    if (alreadyBooked) {
      return NextResponse.json(
        {
          success: false,
          error: 'This time slot is no longer available. Please choose another.',
        },
        { status: 409, headers: CORS_HEADERS }
      )
    }

    const result = await createBookingEvent(
      {
        name,
        email,
        phone,
        business: (body.business as string)?.trim() || undefined,
        message: (body.message as string)?.trim() || undefined,
        slotStart,
        slotEnd,
      },
      agencyId
    )

    await supabase.from('bookings').insert({
      agency_id: agencyId,
      name,
      email,
      start_time: slotStart,
      end_time: slotEnd,
      status: 'scheduled',
      google_event_id: result.eventId,
      google_meet_link: result.meetLink,
    })

    const metadata =
      body.qualificationAnswers || body.opportunityEstimate || body.businessPlaceId
        ? {
            qualificationAnswers: body.qualificationAnswers ?? undefined,
            opportunityEstimate: body.opportunityEstimate ?? undefined,
            businessPlaceId: (body.businessPlaceId as string) || undefined,
          }
        : undefined

    try {
      await supabase.from('leads').insert({
        agency_id: agencyId,
        source: 'scheduled_call',
        name,
        email,
        phone,
        business_name: (body.business as string)?.trim() || null,
        message: (body.message as string)?.trim() || null,
        preferred_time: slotStart,
        timezone: 'America/New_York',
        scheduled_at: slotStart,
        meet_link: result.meetLink,
        ...(metadata && { metadata }),
      })
    } catch (leadErr) {
      console.warn('Lead insert failed (migration may be pending):', leadErr)
    }

    return NextResponse.json(
      {
        success: true,
        meet_link: result.meetLink,
        event_id: result.eventId,
        start_time: slotStart,
        end_time: slotEnd,
      },
      { headers: CORS_HEADERS }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (
      msg.includes('GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON') ||
      msg.includes('No Google account connected')
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Booking is not configured. Connect Google Calendar in Settings.',
        },
        { status: 503, headers: CORS_HEADERS }
      )
    }
    console.error('Booking schedule error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to schedule meeting' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
