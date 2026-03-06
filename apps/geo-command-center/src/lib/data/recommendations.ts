import { createClient } from '@/lib/supabase/server'
import { generateRecommendations } from '@/lib/recommendations/generator'
import type { RecommendationInput } from '@/lib/recommendations/types'
import { getLocationRankingHistory } from './clients'
import { getAIVisibilitySummary, getSearchVisibilitySummary } from './visibility'
import { getCompetitorComparison } from './competitors'

const DAYS = 30

/**
 * Load generator input for a location
 */
export async function getGeneratorInput(
  locationId: string,
  _agencyId: string,
  _clientId: string
) {
  const supabase = await createClient()

  const [rankHistory, trafficRes, reviewsRes, callsRes, aiSummary, searchSummary, comparison] =
    await Promise.all([
      getLocationRankingHistory(locationId, DAYS),
      supabase
        .from('traffic_metrics')
        .select('organic_clicks, recorded_at')
        .eq('location_id', locationId)
        .gte('recorded_at', new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
        .order('recorded_at', { ascending: true }),
      supabase
        .from('reviews')
        .select('count, avg_rating, recorded_at')
        .eq('location_id', locationId)
        .order('recorded_at', { ascending: false })
        .limit(60),
      supabase
        .from('calls_tracked')
        .select('call_count, recorded_at')
        .eq('location_id', locationId)
        .gte('recorded_at', new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
        .order('recorded_at', { ascending: true }),
      getAIVisibilitySummary(locationId, DAYS),
      getSearchVisibilitySummary(locationId, DAYS),
      getCompetitorComparison(locationId).catch(() => null),
    ])

  // Latest rank (best = lowest map rank); history is ordered ascending by date
  const latestRank =
    rankHistory.length > 0
      ? (rankHistory[rankHistory.length - 1].mapRank ?? rankHistory[rankHistory.length - 1].organicRank ?? null)
      : null

  // Rank trend 30d: % change (negative = rank got worse, positive = improved)
  let rankTrend30d: number | null = null
  if (rankHistory.length >= 2) {
    const recent = rankHistory[rankHistory.length - 1]
    const older = rankHistory[0]
    const rn = recent.mapRank ?? recent.organicRank ?? 0
    const ro = older.mapRank ?? older.organicRank ?? 0
    if (ro > 0) rankTrend30d = ((ro - rn) / ro) * 100
  }

  // Review velocity (reviews per day)
  let reviewVelocity = 0
  if (reviewsRes.data && reviewsRes.data.length >= 2) {
    const recent = reviewsRes.data[0]
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - DAYS)
    const older = reviewsRes.data.find(
      (r) => new Date(r.recorded_at) <= thirtyDaysAgo
    ) ?? reviewsRes.data[reviewsRes.data.length - 1]
    const delta = recent.count - (older?.count ?? 0)
    const days = Math.max(
      1,
      Math.floor(
        (new Date(recent.recorded_at).getTime() - new Date(older.recorded_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    )
    reviewVelocity = Math.max(0, delta / days)
  }

  // Rating
  const rating = reviewsRes.data?.[0]?.avg_rating ?? null

  // Traffic trend
  let trafficTrend: 'growth' | 'stable' | 'decline' = 'stable'
  if (trafficRes.data && trafficRes.data.length >= 2) {
    const mid = Math.floor(trafficRes.data.length / 2)
    const recentSum = trafficRes.data.slice(0, mid).reduce((s, t) => s + (t.organic_clicks ?? 0), 0)
    const olderSum = trafficRes.data.slice(mid).reduce((s, t) => s + (t.organic_clicks ?? 0), 0)
    if (olderSum > 0) {
      const pct = ((recentSum - olderSum) / olderSum) * 100
      if (pct > 10) trafficTrend = 'growth'
      else if (pct < -10) trafficTrend = 'decline'
    }
  }

  // Calls trend
  let callsTrend: 'growth' | 'stable' | 'decline' = 'stable'
  if (callsRes.data && callsRes.data.length >= 2) {
    const mid = Math.floor(callsRes.data.length / 2)
    const recentSum = callsRes.data.slice(0, mid).reduce((s, t) => s + (t.call_count ?? 0), 0)
    const olderSum = callsRes.data.slice(mid).reduce((s, t) => s + (t.call_count ?? 0), 0)
    if (olderSum > 0) {
      const pct = ((recentSum - olderSum) / olderSum) * 100
      if (pct > 10) callsTrend = 'growth'
      else if (pct < -10) callsTrend = 'decline'
    }
  }

  // Competitor comparison
  let competitorReviewVelocityHigher = false
  let competitorDeltaReviews: number | undefined
  if (comparison?.competitors?.length) {
    const locationReviews = reviewsRes.data?.[0]?.count ?? 0
    const maxCompetitorReviews = Math.max(
      ...comparison.competitors.map((c) => c.latest_review?.review_count ?? 0)
    )
    competitorDeltaReviews = maxCompetitorReviews - locationReviews
    if (competitorDeltaReviews > 3) competitorReviewVelocityHigher = true
  }

  return {
    latest_rank: latestRank,
    rank_trend_30d: rankTrend30d,
    review_velocity: reviewVelocity,
    rating: rating ? Number(rating) : null,
    traffic_trend: trafficTrend,
    calls_trend: callsTrend,
    ai_visibility_score: aiSummary.avgScore,
    search_visibility_score: searchSummary.avgScore,
    competitor_review_velocity_higher: competitorReviewVelocityHigher,
    competitor_delta_reviews: competitorDeltaReviews,
  }
}

/**
 * Generate and upsert open recommendations for a location.
 * Replaces existing open recommendations.
 */
export async function generateAndUpsertRecommendations(
  locationId: string,
  agencyId: string,
  clientId: string
): Promise<RecommendationInput[]> {
  const supabase = await createClient()
  const input = await getGeneratorInput(locationId, agencyId, clientId)
  const recs = generateRecommendations(input, {
    agency_id: agencyId,
    client_id: clientId,
    location_id: locationId,
  })

  // Mark existing open recommendations as replaced (we'll delete and re-insert for simplicity)
  const { data: existing } = await supabase
    .from('recommendations')
    .select('id')
    .eq('location_id', locationId)
    .eq('status', 'open')
    .eq('created_by', 'system')

  if (existing && existing.length > 0) {
    await supabase
      .from('recommendations')
      .delete()
      .in('id', existing.map((r) => r.id))
  }

  if (recs.length === 0) return []

  const rows = recs.map((r) => ({
    agency_id: r.agency_id,
    client_id: r.client_id,
    location_id: r.location_id,
    type: r.type,
    severity: r.severity,
    title: r.title,
    description: r.description,
    expected_impact: r.expected_impact ?? {},
    status: 'open' as const,
    created_by: r.created_by ?? 'system',
  }))

  const { data: inserted, error } = await supabase
    .from('recommendations')
    .insert(rows)
    .select()

  if (error) {
    console.error('Error inserting recommendations:', error)
    throw new Error('Failed to save recommendations')
  }

  // Log created events
  for (const row of inserted ?? []) {
    await supabase.from('recommendation_events').insert({
      agency_id: agencyId,
      recommendation_id: row.id,
      event_type: 'created',
      metadata: {},
    })
  }

  return inserted ?? []
}

/**
 * Get recommendations for a location with optional filters
 */
export async function getRecommendations(
  locationId: string,
  filters?: { severity?: string; status?: string; type?: string }
) {
  const supabase = await createClient()
  let q = supabase
    .from('recommendations')
    .select('*')
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })

  if (filters?.severity) q = q.eq('severity', filters.severity)
  if (filters?.status) q = q.eq('status', filters.status)
  if (filters?.type) q = q.eq('type', filters.type)

  const { data, error } = await q

  if (error) {
    console.error('Error fetching recommendations:', error)
    return []
  }

  return data ?? []
}
