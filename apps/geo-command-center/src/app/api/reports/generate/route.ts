import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ReportDocument } from '@/components/reports/ReportDocument'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) {
    return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('client_id, agency_id, role')
    .eq('id', user.id)
    .single()

  const isClient = profile?.role === 'client'
  const isAgency = profile?.role === 'admin' || profile?.role === 'staff'
  if (isClient && profile?.client_id !== clientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (isAgency) {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('agency_id')
      .eq('id', clientId)
      .single()
    if (clientRow?.agency_id !== profile?.agency_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }
  if (!isClient && !isAgency) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: client } = await supabase
    .from('clients')
    .select('name')
    .eq('id', clientId)
    .single()
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name')
    .eq('client_id', clientId)
  const locationIds = (locations || []).map((l) => l.id)

  let rankingsRes: { location_id: string; map_pack_position?: number; organic_position?: number }[] = []
  let trafficRes: { location_id: string; organic_clicks: number }[] = []
  let reviewsRes: { location_id: string; count: number }[] = []
  let callsRes: { location_id: string; call_count: number }[] = []
  let revenueRes: { location_id: string; estimated_monthly_lift: number }[] = []

  if (locationIds.length > 0) {
    const [r1, r2, r3, r4, r5] = await Promise.all([
      supabase.from('rankings').select('location_id, map_pack_position, organic_position').in('location_id', locationIds).order('recorded_at', { ascending: false }),
      supabase.from('traffic_metrics').select('location_id, organic_clicks').in('location_id', locationIds),
      supabase.from('reviews').select('location_id, count').in('location_id', locationIds).order('recorded_at', { ascending: false }),
      supabase.from('calls_tracked').select('location_id, call_count').in('location_id', locationIds),
      supabase.from('revenue_estimates').select('location_id, estimated_monthly_lift').in('location_id', locationIds).order('calculated_at', { ascending: false }),
    ])
    rankingsRes = r1.data || []
    trafficRes = r2.data || []
    reviewsRes = r3.data || []
    callsRes = r4.data || []
    revenueRes = r5.data || []
  }

  const locationsData = (locations || []).map((loc) => {
    const latestRank = rankingsRes.find((r) => r.location_id === loc.id)
    const prevRank = rankingsRes.filter((r) => r.location_id === loc.id)[1]
    const currentRank = latestRank?.map_pack_position ?? latestRank?.organic_position ?? null
    const previousRank = prevRank?.map_pack_position ?? prevRank?.organic_position ?? null
    const rankChange = currentRank !== null && previousRank !== null 
      ? ((previousRank - currentRank) / previousRank) * 100 
      : 0
    const traffic = trafficRes.filter((t) => t.location_id === loc.id).reduce((s, t) => s + t.organic_clicks, 0)
    const latestReviews = reviewsRes.find((r) => r.location_id === loc.id)?.count ?? 0
    const calls = callsRes.filter((c) => c.location_id === loc.id).reduce((s, c) => s + c.call_count, 0)
    const revenue = revenueRes.find((r) => r.location_id === loc.id)?.estimated_monthly_lift ?? 0
    
    return {
      name: loc.name,
      rank: currentRank,
      previousRank,
      rankChange,
      organicClicks: traffic,
      reviews: latestReviews,
      calls,
      estimatedRevenue: revenue,
    }
  })

  const ranksWithValue = locationsData.filter((l) => l.rank != null)
  const avgRank = ranksWithValue.length 
    ? ranksWithValue.reduce((s, l) => s + (l.rank ?? 0), 0) / ranksWithValue.length 
    : 0

  const topPerformer = locationsData.reduce((best, loc) => 
    (loc.rank ?? 999) < (best.rank ?? 999) ? loc : best
  , locationsData[0] || { name: 'N/A', rank: null })

  const biggestImprovement = locationsData.reduce((best, loc) => 
    Math.abs(loc.rankChange) > Math.abs(best.rankChange) ? loc : best
  , locationsData[0] || { name: 'N/A', rankChange: 0 })

  const totalRevenue = locationsData.reduce((s, l) => s + l.estimatedRevenue, 0)

  const reportData = {
    clientName: client.name,
    generatedAt: new Date().toISOString(),
    dateRange: 'Last 30 Days',
    locations: locationsData,
    totals: {
      locations: locationsData.length,
      avgRank,
      organicClicks: trafficRes.reduce((s, t) => s + t.organic_clicks, 0),
      reviews: reviewsRes.reduce((s, r) => s + r.count, 0),
      calls: callsRes.reduce((s, c) => s + c.call_count, 0),
      revenue: totalRevenue,
    },
    highlights: {
      topPerformer: `${topPerformer.name} (Rank #${topPerformer.rank ?? 'N/A'})`,
      biggestImprovement: `${biggestImprovement.name} (${biggestImprovement.rankChange > 0 ? '+' : ''}${biggestImprovement.rankChange.toFixed(0)}%)`,
      totalImprovement: `${totalRevenue > 0 ? '+' : ''}$${totalRevenue.toLocaleString()}/mo revenue lift`,
    },
  }

  try {
    const { renderToBuffer } = await import('@react-pdf/renderer')
    const React = await import('react')
    const doc = React.createElement(ReportDocument, { data: reportData })
    const buffer = await renderToBuffer(doc as Parameters<typeof renderToBuffer>[0])
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${client.name.replace(/\s+/g, '-')}-report.pdf"`,
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
