/**
 * GET /api/integrations/google-calendar/callback
 * OAuth callback: exchanges code for tokens, stores in google_calendar_oauth_tokens.
 * Required redirect URI: {YOUR_DOMAIN}/api/integrations/google-calendar/callback
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getGoogleCalendarTokens } from '@/lib/integrations/google-calendar-oauth'

function getBaseUrl() {
  const u =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000'
  return u.startsWith('http') ? u : `https://${u}`
}

/** URL to redirect users to after OAuth completes. Set to AGS URL in production. */
function getSuccessRedirectUrl() {
  const custom = process.env.GOOGLE_CALENDAR_OAUTH_SUCCESS_REDIRECT_URL
  if (custom?.trim()) return custom.trim()
  const base = getBaseUrl()
  return `${base}/dashboard/settings`
}

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl()
  const redirectUri = `${baseUrl}/api/integrations/google-calendar/callback`

  try {
    const code = req.nextUrl.searchParams.get('code')
    const state = req.nextUrl.searchParams.get('state')
    const error = req.nextUrl.searchParams.get('error')

    const successBase = getSuccessRedirectUrl()
    if (error) {
      return NextResponse.redirect(
        `${successBase}?google_calendar_error=${encodeURIComponent(error)}`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${successBase}?google_calendar_error=missing_params`
      )
    }

    let payload: { agency_id: string }
    try {
      payload = JSON.parse(Buffer.from(state, 'base64url').toString())
    } catch {
      return NextResponse.redirect(
        `${successBase}?google_calendar_error=invalid_state`
      )
    }

    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${successBase}?google_calendar_error=not_configured`
      )
    }

    const tokens = await getGoogleCalendarTokens(
      { clientId, clientSecret, redirectUri },
      code
    )

    const refreshToken = tokens.refresh_token as string | undefined
    if (!refreshToken) {
      return NextResponse.redirect(
        `${successBase}?google_calendar_error=no_refresh_token`
      )
    }

    const expiryDate = (tokens as { expiry_date?: number }).expiry_date
    const expiresAt = expiryDate ? new Date(expiryDate).toISOString() : null

    const supabase = getSupabaseAdmin()
    const { error: upsertErr } = await supabase
      .from('google_calendar_oauth_tokens')
      .upsert(
        {
          agency_id: payload.agency_id,
          refresh_token: refreshToken,
          access_token: (tokens.access_token as string) || null,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'agency_id',
          ignoreDuplicates: false,
        }
      )

    if (upsertErr) {
      console.error('Google Calendar token upsert error:', upsertErr)
      return NextResponse.redirect(
        `${successBase}?google_calendar_error=save_failed`
      )
    }

    return NextResponse.redirect(
      `${successBase}?google_calendar_connected=1`
    )
  } catch (err) {
    console.error('Google Calendar callback error:', err)
    const successBase = getSuccessRedirectUrl()
    return NextResponse.redirect(
      `${successBase}?google_calendar_error=callback_failed`
    )
  }
}
