import { createClient } from '@/lib/supabase/server'

export async function getClients(agencyId: string) {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('agency_id', agencyId)
    .order('name')
  return clients || []
}

export async function getClientWithLocations(clientId: string) {
  const supabase = await createClient()
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()
  if (!client) return null

  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('client_id', clientId)
    .order('name')

  const locationIds = (locations || []).map((l) => l.id)

  const [rankingsRes, trafficRes, reviewsRes, callsRes, revenueRes] = await Promise.all([
    supabase
      .from('rankings')
      .select('location_id, map_pack_position, organic_position, recorded_at')
      .in('location_id', locationIds)
      .order('recorded_at', { ascending: false }),
    supabase
      .from('traffic_metrics')
      .select('location_id, organic_clicks, recorded_at')
      .in('location_id', locationIds)
      .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
    supabase
      .from('reviews')
      .select('location_id, count, recorded_at')
      .in('location_id', locationIds)
      .order('recorded_at', { ascending: false }),
    supabase
      .from('calls_tracked')
      .select('location_id, call_count, recorded_at')
      .in('location_id', locationIds)
      .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
    supabase
      .from('revenue_estimates')
      .select('location_id, estimated_monthly_lift')
      .in('location_id', locationIds)
      .order('calculated_at', { ascending: false }),
  ])

  const locationsWithMetrics = (locations || []).map((loc) => {
    const latestRank = (rankingsRes.data || []).find((r) => r.location_id === loc.id)
    const prevRank = (rankingsRes.data || []).filter((r) => r.location_id === loc.id)[1]
    const traffic = (trafficRes.data || [])
      .filter((t) => t.location_id === loc.id)
      .reduce((s, t) => s + t.organic_clicks, 0)
    const reviews = (reviewsRes.data || []).find((r) => r.location_id === loc.id)?.count ?? 0
    const calls = (callsRes.data || [])
      .filter((c) => c.location_id === loc.id)
      .reduce((s, c) => s + c.call_count, 0)
    const revenueLift = (revenueRes.data || []).find((r) => r.location_id === loc.id)?.estimated_monthly_lift ?? 0
    const currentRank = latestRank?.map_pack_position ?? latestRank?.organic_position ?? null
    const previousRank = prevRank?.map_pack_position ?? prevRank?.organic_position ?? null
    const rankChange = currentRank !== null && previousRank !== null
      ? ((previousRank - currentRank) / previousRank) * 100
      : 0

    return {
      ...loc,
      currentRank,
      previousRank,
      rankChange,
      organicClicks: traffic,
      calls,
      reviews,
      estimatedRevenueLift: revenueLift,
    }
  })

  const ranksWithValue = locationsWithMetrics.filter((l) => l.currentRank != null)
  const totals = {
    locations: locationsWithMetrics.length,
    avgMapRank: ranksWithValue.length
      ? ranksWithValue.reduce((s, l) => s + (l.currentRank ?? 0), 0) / ranksWithValue.length
      : 0,
    organicClicks: locationsWithMetrics.reduce((s, l) => s + l.organicClicks, 0),
    totalCalls: locationsWithMetrics.reduce((s, l) => s + l.calls, 0),
    reviewsGained: locationsWithMetrics.reduce((s, l) => s + l.reviews, 0),
    estimatedRevenueLift: locationsWithMetrics.reduce((s, l) => s + l.estimatedRevenueLift, 0),
  }

  return { client, locations: locationsWithMetrics, totals }
}

export async function getLocationRankingHistory(locationId: string, days = 30) {
  const supabase = await createClient()
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  
  const { data } = await supabase
    .from('rankings')
    .select('map_pack_position, organic_position, recorded_at')
    .eq('location_id', locationId)
    .gte('recorded_at', startDate)
    .order('recorded_at', { ascending: true })

  return (data || []).map((r) => ({
    date: new Date(r.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    mapRank: r.map_pack_position,
    organicRank: r.organic_position,
  }))
}

export async function getLocationTrafficHistory(locationId: string, days = 30) {
  const supabase = await createClient()
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  
  const { data } = await supabase
    .from('traffic_metrics')
    .select('organic_clicks, impressions, recorded_at')
    .eq('location_id', locationId)
    .gte('recorded_at', startDate)
    .order('recorded_at', { ascending: true })

  return (data || []).map((t) => ({
    date: new Date(t.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    clicks: t.organic_clicks,
    impressions: t.impressions,
  }))
}

export async function getLocationCallsReviewsHistory(locationId: string, days = 30) {
  const supabase = await createClient()
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  
  const [callsRes, reviewsRes] = await Promise.all([
    supabase
      .from('calls_tracked')
      .select('call_count, recorded_at')
      .eq('location_id', locationId)
      .gte('recorded_at', startDate)
      .order('recorded_at', { ascending: true }),
    supabase
      .from('reviews')
      .select('count, recorded_at')
      .eq('location_id', locationId)
      .gte('recorded_at', startDate)
      .order('recorded_at', { ascending: true }),
  ])

  // Merge by date
  const dates = new Set([
    ...(callsRes.data || []).map((c) => c.recorded_at),
    ...(reviewsRes.data || []).map((r) => r.recorded_at),
  ])

  return Array.from(dates).sort().map((date) => {
    const calls = callsRes.data?.find((c) => c.recorded_at === date)?.call_count ?? 0
    const reviews = reviewsRes.data?.find((r) => r.recorded_at === date)?.count ?? 0
    return {
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      calls,
      reviews,
    }
  })
}
