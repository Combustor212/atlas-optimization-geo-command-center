/**
 * GET /api/integrations/gsc/connect
 * Initiates GSC OAuth flow. Returns auth URL for redirect.
 * TODO: Add GSC_CLIENT_ID, GSC_CLIENT_SECRET, GSC_REDIRECT_URI to env
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGSCAuthUrl } from '@/lib/integrations/google-search-console'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, client_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency' }, { status: 403 })
    }

    const clientId = req.nextUrl.searchParams.get('client_id') ?? profile.client_id
    const locationId = req.nextUrl.searchParams.get('location_id')

    const gscClientId = process.env.GSC_CLIENT_ID
    const gscClientSecret = process.env.GSC_CLIENT_SECRET
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    const redirectUri = `${baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`}/api/integrations/gsc/callback`

    if (!gscClientId || !gscClientSecret) {
      return NextResponse.json({
        error: 'GSC OAuth not configured',
        hint: 'Add GSC_CLIENT_ID and GSC_CLIENT_SECRET to env. See GOOGLE_PLACES_SETUP.md for GSC setup.',
      }, { status: 503 })
    }

    // Store pending state for callback (client_id, location_id, agency_id)
    const state = Buffer.from(
      JSON.stringify({
        agency_id: profile.agency_id,
        client_id: clientId,
        location_id: locationId || null,
      })
    ).toString('base64url')

    const authUrl = getGSCAuthUrl(
      {
        clientId: gscClientId,
        clientSecret: gscClientSecret,
        redirectUri,
      },
      state
    )

    return NextResponse.json({
      authUrl,
      message: 'Redirect user to authUrl to connect GSC',
    })
  } catch (err) {
    console.error('GSC connect error:', err)
    return NextResponse.json({ error: 'Failed to initiate GSC connection' }, { status: 500 })
  }
}
