/**
 * GET /api/integrations/gsc/callback
 * OAuth callback: exchanges code for tokens, stores in gsc_oauth_tokens
 * TODO: Ensure redirect_uri matches GSC app config
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGSCTokens } from '@/lib/integrations/google-search-console'

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    const state = req.nextUrl.searchParams.get('state')
    const error = req.nextUrl.searchParams.get('error')

    if (error) {
      const redirect = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?gsc_error=${encodeURIComponent(error)}`
      return NextResponse.redirect(redirect)
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?gsc_error=missing_params`
      )
    }

    let payload: { agency_id: string; client_id: string | null; location_id: string | null }
    try {
      payload = JSON.parse(Buffer.from(state, 'base64url').toString())
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?gsc_error=invalid_state`
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    const redirectUri = `${baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`}/api/integrations/gsc/callback`

    const gscClientId = process.env.GSC_CLIENT_ID
    const gscClientSecret = process.env.GSC_CLIENT_SECRET
    if (!gscClientId || !gscClientSecret) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?gsc_error=not_configured`
      )
    }

    const tokens = await getGSCTokens(
      {
        clientId: gscClientId,
        clientSecret: gscClientSecret,
        redirectUri,
      },
      code
    )

    const supabase = await createClient()
    const accessToken = tokens.access_token as string | undefined
    const refreshToken = tokens.refresh_token as string | undefined
    const expiryDate = (tokens as { expiry_date?: number }).expiry_date
    const expiresAt = expiryDate ? new Date(expiryDate).toISOString() : null

    const { error: upsertErr } = await supabase.from('gsc_oauth_tokens').upsert(
      {
        agency_id: payload.agency_id,
        client_id: payload.client_id,
        location_id: payload.location_id,
        provider: 'gsc',
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'agency_id,provider',
        ignoreDuplicates: false,
      }
    )

    if (upsertErr) {
      console.error('GSC token upsert error:', upsertErr)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?gsc_error=save_failed`
      )
    }

    const successUrl = payload.client_id
      ? `/dashboard/clients/${payload.client_id}?gsc_connected=1`
      : '/dashboard?gsc_connected=1'
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${successUrl}`
    )
  } catch (err) {
    console.error('GSC callback error:', err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?gsc_error=callback_failed`
    )
  }
}
