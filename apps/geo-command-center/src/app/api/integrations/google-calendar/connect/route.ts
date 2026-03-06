/**
 * GET /api/integrations/google-calendar/connect
 * Initiates Google Calendar OAuth flow. Admin-only.
 * Returns auth URL for redirect.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/scope'
import { getGoogleCalendarAuthUrl } from '@/lib/integrations/google-calendar-oauth'

function getSettingsUrl() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000'
  return `${base.startsWith('http') ? base : `https://${base}`}/dashboard/settings`
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(['admin', 'staff'])
    const supabase = await createClient()
    const settingsUrl = getSettingsUrl()

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.redirect(`${settingsUrl}?google_calendar_error=no_agency`)
    }

    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_URL ||
      'http://localhost:3000'
    const redirectUri = `${baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`}/api/integrations/google-calendar/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${settingsUrl}?google_calendar_error=not_configured`)
    }

    const state = Buffer.from(
      JSON.stringify({ agency_id: profile.agency_id })
    ).toString('base64url')

    const authUrl = getGoogleCalendarAuthUrl(
      { clientId, clientSecret, redirectUri },
      state
    )

    return NextResponse.redirect(authUrl)
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err && String((err as { digest?: string }).digest)?.startsWith('NEXT_REDIRECT')) {
      throw err
    }
    console.error('Google Calendar connect error:', err)
    return NextResponse.json(
      { error: 'Failed to initiate Google Calendar connection' },
      { status: 500 }
    )
  }
}
