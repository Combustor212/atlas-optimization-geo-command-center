/**
 * Google Calendar API integration for Book a Call scheduling.
 * Fetches available slots and creates events with Google Meet links.
 *
 * Auth: Prefers OAuth (admin connects Google) over service account.
 * - OAuth: GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, admin connects via Settings
 * - Service account fallback: GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON, GOOGLE_CALENDAR_ID
 */

import { google } from 'googleapis'
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getGoogleCalendarOAuthClient } from '@/lib/integrations/google-calendar-oauth'

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary'
const TIMEZONE = 'America/New_York'
const SLOT_DURATION_MINUTES = 30
const BUSINESS_HOURS = { start: 9, end: 18 } // 9am - 6pm

function getBusinessHoursUtc(dateStr: string): { timeMin: Date; timeMax: Date } {
  const timeMin = fromZonedTime(
    `${dateStr}T${String(BUSINESS_HOURS.start).padStart(2, '0')}:00:00`,
    TIMEZONE
  )
  const timeMax = fromZonedTime(
    `${dateStr}T${String(BUSINESS_HOURS.end).padStart(2, '0')}:00:00`,
    TIMEZONE
  )
  return { timeMin, timeMax }
}

/** Get OAuth-based auth for the given agency. Returns null if not connected. */
async function getOAuthCalendarAuth(agencyId: string): Promise<ReturnType<typeof google.auth.OAuth2.prototype> | null> {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`}/api/integrations/google-calendar/callback`

  if (!clientId || !clientSecret) return null

  const supabase = getSupabaseAdmin()
  const { data: row } = await supabase
    .from('google_calendar_oauth_tokens')
    .select('refresh_token, access_token, expires_at')
    .eq('agency_id', agencyId)
    .single()

  if (!row?.refresh_token) return null

  const oauth2Client = getGoogleCalendarOAuthClient({
    clientId,
    clientSecret,
    redirectUri,
    accessToken: row.access_token || undefined,
    refreshToken: row.refresh_token,
  })

  const isExpired = row.expires_at && new Date(row.expires_at) <= new Date()
  if (isExpired) {
    const { credentials } = await oauth2Client.refreshAccessToken()
    if (credentials.access_token) {
      await supabase
        .from('google_calendar_oauth_tokens')
        .update({
          access_token: credentials.access_token,
          expires_at: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('agency_id', agencyId)
    }
  }

  return oauth2Client
}

/** Get service account auth. Throws if not configured. */
function getServiceAccountAuth() {
  const json = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON
  if (!json) {
    throw new Error('GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON is required for booking')
  }
  let credentials: { client_email?: string; private_key?: string }
  try {
    credentials = JSON.parse(json) as { client_email?: string; private_key?: string }
  } catch {
    throw new Error('GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON must be valid JSON')
  }
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('Service account JSON must include client_email and private_key')
  }
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
}

const NOT_CONFIGURED_MSG = 'No Google account connected. Connect Google Calendar in Settings, or set GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON.'

/** Get calendar auth: OAuth first, then service account. */
async function getCalendarAuth(agencyId: string | null): Promise<google.auth.OAuth2 | InstanceType<typeof google.auth.GoogleAuth>> {
  if (agencyId) {
    const oauth = await getOAuthCalendarAuth(agencyId)
    if (oauth) return oauth
  }
  try {
    return getServiceAccountAuth()
  } catch {
    throw new Error(NOT_CONFIGURED_MSG)
  }
}

export interface TimeSlot {
  start: string
  end: string
}

/**
 * Fetch available 30-min slots for a given date.
 * Uses freebusy.query to find gaps between busy blocks.
 */
export async function getAvailableSlots(
  dateStr: string,
  agencyId?: string | null
): Promise<TimeSlot[]> {
  const auth = await getCalendarAuth(agencyId ?? null)
  const calendar = google.calendar({ version: 'v3', auth })

  const { timeMin, timeMax } = getBusinessHoursUtc(dateStr)

  const { data } = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: CALENDAR_ID }],
    },
  })

  const busy = data.calendars?.[CALENDAR_ID]?.busy ?? []
  const slots: TimeSlot[] = []
  let cursor = new Date(timeMin)

  while (cursor < timeMax) {
    const slotEnd = new Date(cursor)
    slotEnd.setMinutes(slotEnd.getMinutes() + SLOT_DURATION_MINUTES)
    if (slotEnd > timeMax) break

    const slotStartIso = cursor.toISOString()
    const slotEndIso = slotEnd.toISOString()

    const isBusy = busy.some(
      (b) =>
        (b.start && b.end && new Date(b.start) < slotEnd && new Date(b.end) > cursor)
    )
    if (!isBusy) {
      slots.push({ start: slotStartIso, end: slotEndIso })
    }

    cursor = slotEnd
  }

  return slots
}

export interface ScheduleInput {
  name: string
  email: string
  phone: string
  business?: string
  message?: string
  slotStart: string
  slotEnd: string
}

export interface ScheduleResult {
  meetLink: string
  eventId: string
  htmlLink: string
}

/** Check if OAuth is connected for the agency. */
export async function isGoogleCalendarConnected(agencyId: string): Promise<boolean> {
  const auth = await getOAuthCalendarAuth(agencyId)
  return !!auth
}

/** Check for existing booking in the same slot (double-booking prevention). */
export async function hasExistingBooking(
  agencyId: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  // Use strict overlap: booking overlaps slot only if booking.start < slot.end AND booking.end > slot.start.
  // Adjacent slots (e.g. 5:00-5:30 and 5:30-6:00) must NOT be considered overlapping.
  const { data } = await supabase
    .from('bookings')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('status', 'scheduled')
    .lt('start_time', endTime)
    .gt('end_time', startTime)
    .limit(1)

  return !!(data && data.length > 0)
}

/**
 * Create a calendar event with Google Meet link.
 */
export async function createBookingEvent(
  input: ScheduleInput,
  agencyId?: string | null
): Promise<ScheduleResult> {
  const auth = await getCalendarAuth(agencyId ?? null)
  const calendar = google.calendar({ version: 'v3', auth })

  const summary = `AGS Strategy Call - ${input.name}`
  const description = [
    `Atlas Growth Strategy Call`,
    `Booked via AGS Book a Call`,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Phone: ${input.phone}`,
    input.business ? `Business: ${input.business}` : null,
    input.message ? `Notes: ${input.message}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const startLocal = formatInTimeZone(new Date(input.slotStart), TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss")
  const endLocal = formatInTimeZone(new Date(input.slotEnd), TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss")

  const resource = {
    summary,
    description,
    start: {
      dateTime: startLocal,
      timeZone: TIMEZONE,
    },
    end: {
      dateTime: endLocal,
      timeZone: TIMEZONE,
    },
    attendees: [{ email: input.email }],
    conferenceData: {
      createRequest: {
        requestId: `ags-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  }

  const { data } = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: resource,
    conferenceDataVersion: 1,
    sendUpdates: 'all',
  })

  const meetLink = data.conferenceData?.entryPoints?.find(
    (e) => e.entryPointType === 'video'
  )?.uri

  if (!meetLink) {
    throw new Error('Google Meet link was not created')
  }

  return {
    meetLink,
    eventId: data.id!,
    htmlLink: data.htmlLink || '',
  }
}
