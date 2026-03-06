/**
 * GET/POST /api/scores/unified
 * Compute and optionally store unified MEO/SEO/GEO scores
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeUnifiedScores } from '@/lib/scores'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = req.nextUrl.searchParams.get('client_id')
    const locationId = req.nextUrl.searchParams.get('location_id') || undefined
    if (!clientId) {
      return NextResponse.json({ error: 'client_id required' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, client_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency' }, { status: 403 })
    }

    // Client users can only view own client
    if (profile.client_id && profile.client_id !== clientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await computeUnifiedScores({
      clientId,
      locationId: locationId || null,
      agencyId: profile.agency_id,
    })

    return NextResponse.json({ data: result })
  } catch (err) {
    console.error('Unified scores error:', err)
    return NextResponse.json({ error: 'Failed to compute scores' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const clientId = body.client_id ?? req.nextUrl.searchParams.get('client_id')
    const locationId = (body.location_id ?? req.nextUrl.searchParams.get('location_id')) || null

    if (!clientId) {
      return NextResponse.json({ error: 'client_id required' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency' }, { status: 403 })
    }

    const result = await computeUnifiedScores({
      clientId,
      locationId,
      agencyId: profile.agency_id,
    })

    const { error: insertErr } = await supabase.from('unified_scores').insert({
      agency_id: profile.agency_id,
      client_id: clientId,
      location_id: locationId,
      meo_score: result.scores.meo,
      seo_score: result.scores.seo,
      geo_score: result.scores.geo,
      overall_score: result.scores.overall,
      final_score: result.scores.final,
      score_meta: result.score_meta,
    })

    if (insertErr) {
      console.error('unified_scores insert error:', insertErr)
    }

    return NextResponse.json({
      data: result,
      stored: !insertErr,
    })
  } catch (err) {
    console.error('Unified scores POST error:', err)
    return NextResponse.json({ error: 'Failed to compute scores' }, { status: 500 })
  }
}
