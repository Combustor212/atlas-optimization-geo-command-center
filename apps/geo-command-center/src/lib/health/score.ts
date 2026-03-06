/**
 * Client Health Score (0–100) and churn risk bands.
 * Normalizes factors 0–1 (improving = positive), weighted sum => score; band by thresholds.
 */

import { createClient } from '@/lib/supabase/server'

export type HealthBand = 'healthy' | 'watch' | 'risk'

export const DEFAULT_BAND_THRESHOLDS = {
  healthy: 70, // >= 70
  watch: 40,   // 40–69
  risk: 0,     // < 40
} as const

/** Default factor weights (sum = 1). */
export const DEFAULT_FACTOR_WEIGHTS: Record<string, number> = {
  rank_trend_30d: 0.25,
  review_velocity_trend: 0.15,
  calls_trend: 0.2,
  traffic_trend: 0.2,
  roi_trend: 0.2,
  engagement: 0,
}

export interface HealthFactorInput {
  rank_trend_30d: number | null
  review_velocity_trend: number | null
  calls_trend: number | null
  traffic_trend: number | null
  roi_trend: number | null
  engagement: number | null
}

export interface HealthFactorContribution {
  value: number
  normalized: number
  weight: number
  contribution: number
  label: string
}

export interface HealthScoreResult {
  score: number
  band: HealthBand
  factors: Record<string, HealthFactorContribution>
  factorInputs: HealthFactorInput
}

/** Clamp and normalize a trend (e.g. -1 to 1 or percentage) to 0–1. Improving = higher. */
function normalizeTrend(value: number | null): number {
  if (value == null || Number.isNaN(value)) return 0.5
  // Assume value is e.g. % change or ratio; map -100..+100 -> 0..1
  const clamped = Math.max(-1, Math.min(1, value))
  return (clamped + 1) / 2
}

/** Get band from score using default thresholds. */
export function getBand(score: number): HealthBand {
  if (score >= DEFAULT_BAND_THRESHOLDS.healthy) return 'healthy'
  if (score >= DEFAULT_BAND_THRESHOLDS.watch) return 'watch'
  return 'risk'
}

/**
 * Fetch raw inputs for health scoring for a client (aggregates across locations).
 * Uses last 30d vs previous 30d for trends.
 */
export async function fetchHealthFactorInputs(
  clientId: string,
  locationId: string | null
): Promise<HealthFactorInput> {
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, agency_id')
    .eq('id', clientId)
    .single()
  if (!client) {
    return {
      rank_trend_30d: null,
      review_velocity_trend: null,
      calls_trend: null,
      traffic_trend: null,
      roi_trend: null,
      engagement: null,
    }
  }

  let locationIds: string[] = []
  if (locationId) {
    const { data: loc } = await supabase
      .from('locations')
      .select('id')
      .eq('id', locationId)
      .eq('client_id', clientId)
      .single()
    if (loc) locationIds = [loc.id]
  }
  if (locationIds.length === 0) {
    const { data: locs } = await supabase
      .from('locations')
      .select('id')
      .eq('client_id', clientId)
    locationIds = (locs || []).map((l) => l.id)
  }

  const now = new Date()
  const endRecent = now.toISOString().slice(0, 10)
  const startRecent = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const startPrevious = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  if (locationIds.length === 0) {
    return {
      rank_trend_30d: null,
      review_velocity_trend: null,
      calls_trend: null,
      traffic_trend: null,
      roi_trend: null,
      engagement: null,
    }
  }

  const [
    rankingsRes,
    reviewsRes,
    callsRes,
    trafficRes,
    revenueRes,
  ] = await Promise.all([
    supabase
      .from('rankings')
      .select('location_id, map_pack_position, organic_position, recorded_at')
      .in('location_id', locationIds)
      .gte('recorded_at', startPrevious)
      .order('recorded_at', { ascending: true }),
    supabase
      .from('reviews')
      .select('location_id, count, recorded_at')
      .in('location_id', locationIds)
      .gte('recorded_at', startPrevious),
    supabase
      .from('calls_tracked')
      .select('location_id, call_count, recorded_at')
      .in('location_id', locationIds)
      .gte('recorded_at', startPrevious),
    supabase
      .from('traffic_metrics')
      .select('location_id, organic_clicks, recorded_at')
      .in('location_id', locationIds)
      .gte('recorded_at', startPrevious),
    supabase
      .from('revenue_estimates')
      .select('location_id, estimated_monthly_lift, calculated_at')
      .in('location_id', locationIds)
      .order('calculated_at', { ascending: false })
      .limit(locationIds.length * 4),
  ])

  const rankRows = rankingsRes.data || []
  const reviewRows = reviewsRes.data || []
  const callRows = callsRes.data || []
  const trafficRows = trafficRes.data || []
  const revenueRows = revenueRes.data || []

  const rankByLoc = (rows: typeof rankRows, period: 'recent' | 'previous') => {
    const start = period === 'recent' ? startRecent : startPrevious
    const end = period === 'recent' ? endRecent : startRecent
    return rows.filter((r) => {
      const d = r.recorded_at?.slice(0, 10)
      return d && d >= start && d < end
    })
  }
  const recentRank = rankByLoc(rankRows, 'recent')
  const previousRank = rankByLoc(rankRows, 'previous')
  const avgPosition = (rows: typeof rankRows) => {
    if (rows.length === 0) return null
    const positions = rows.map((r) => r.map_pack_position ?? r.organic_position ?? 100).filter((p) => p != null)
    if (positions.length === 0) return null
    return positions.reduce((a, b) => a + b, 0) / positions.length
  }
  const avgRecent = avgPosition(recentRank)
  const avgPrevious = avgPosition(previousRank)
  let rank_trend_30d: number | null = null
  if (avgRecent != null && avgPrevious != null && avgPrevious > 0) {
    rank_trend_30d = (avgPrevious - avgRecent) / avgPrevious
  }

  const sumByLoc = (
    rows: { location_id: string; count?: number; call_count?: number; organic_clicks?: number; recorded_at?: string }[],
    key: 'count' | 'call_count' | 'organic_clicks',
    period: 'recent' | 'previous'
  ) => {
    const start = period === 'recent' ? startRecent : startPrevious
    const end = period === 'recent' ? endRecent : startRecent
    return rows
      .filter((r) => {
        const d = r.recorded_at?.slice(0, 10)
        return d && d >= start && d < end
      })
      .reduce((s, r) => s + (Number((r as Record<string, unknown>)[key]) || 0), 0)
  }
  const reviewRecent = sumByLoc(reviewRows as { location_id: string; count?: number; recorded_at?: string }[], 'count', 'recent')
  const reviewPrevious = sumByLoc(reviewRows as { location_id: string; count?: number; recorded_at?: string }[], 'count', 'previous')
  let review_velocity_trend: number | null = null
  if (reviewPrevious > 0) {
    review_velocity_trend = (reviewRecent - reviewPrevious) / reviewPrevious
  } else if (reviewRecent > 0) {
    review_velocity_trend = 1
  }

  const callsRecent = sumByLoc(callRows as { location_id: string; call_count?: number; recorded_at?: string }[], 'call_count', 'recent')
  const callsPrevious = sumByLoc(callRows as { location_id: string; call_count?: number; recorded_at?: string }[], 'call_count', 'previous')
  let calls_trend: number | null = null
  if (callsPrevious > 0) {
    calls_trend = (callsRecent - callsPrevious) / callsPrevious
  } else if (callsRecent > 0) {
    calls_trend = 1
  }

  const trafficRecent = sumByLoc(trafficRows as { location_id: string; organic_clicks?: number; recorded_at?: string }[], 'organic_clicks', 'recent')
  const trafficPrevious = sumByLoc(trafficRows as { location_id: string; organic_clicks?: number; recorded_at?: string }[], 'organic_clicks', 'previous')
  let traffic_trend: number | null = null
  if (trafficPrevious > 0) {
    traffic_trend = (trafficRecent - trafficPrevious) / trafficPrevious
  } else if (trafficRecent > 0) {
    traffic_trend = 1
  }

  const latestRevenue = revenueRows[0]?.estimated_monthly_lift ?? 0
  const olderRevenue = revenueRows[revenueRows.length - 1]?.estimated_monthly_lift ?? 0
  let roi_trend: number | null = null
  if (olderRevenue > 0) {
    roi_trend = (Number(latestRevenue) - Number(olderRevenue)) / Number(olderRevenue)
  } else if (Number(latestRevenue) > 0) {
    roi_trend = 1
  }

  return {
    rank_trend_30d,
    review_velocity_trend,
    calls_trend,
    traffic_trend,
    roi_trend,
    engagement: null,
  }
}

/**
 * Compute health score from factor inputs using default weights and thresholds.
 * Returns score 0–100, band, and factor breakdown (contributions).
 */
export function computeHealthScore(
  inputs: HealthFactorInput,
  weights: Record<string, number> = DEFAULT_FACTOR_WEIGHTS
): HealthScoreResult {
  const factorLabels: Record<string, string> = {
    rank_trend_30d: 'Rank trend (30d)',
    review_velocity_trend: 'Review velocity trend',
    calls_trend: 'Calls trend',
    traffic_trend: 'Traffic trend',
    roi_trend: 'ROI trend',
    engagement: 'Engagement',
  }
  const w = { ...DEFAULT_FACTOR_WEIGHTS, ...weights }
  const factors: Record<string, HealthFactorContribution> = {}
  let totalWeight = 0
  let weightedSum = 0

  const keys: (keyof HealthFactorInput)[] = [
    'rank_trend_30d',
    'review_velocity_trend',
    'calls_trend',
    'traffic_trend',
    'roi_trend',
    'engagement',
  ]
  for (const key of keys) {
    const weight = w[key] ?? 0
    if (weight <= 0) continue
    totalWeight += weight
    const raw = inputs[key]
    const normalized =
      key === 'engagement'
        ? (raw != null ? Number(raw) : 0.5)
        : typeof raw === 'number'
          ? normalizeTrend(raw)
          : 0.5
    const contribution = weight * normalized
    weightedSum += contribution
    factors[key] = {
      value: raw ?? 0,
      normalized,
      weight,
      contribution: Math.round(contribution * 100) / 100,
      label: factorLabels[key] ?? key,
    }
  }

  const score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 50
  const clampedScore = Math.max(0, Math.min(100, score))
  const band = getBand(clampedScore)

  return {
    score: clampedScore,
    band,
    factors,
    factorInputs: inputs,
  }
}

/**
 * Calculate health score for a client and return result (does not persist).
 */
export async function calculateClientHealth(
  clientId: string,
  locationId: string | null,
  _agencyId: string
): Promise<HealthScoreResult> {
  const inputs = await fetchHealthFactorInputs(clientId, locationId)
  const result = computeHealthScore(inputs)
  return result
}

/**
 * Calculate health score for a client and insert into health_scores. Returns the new row.
 */
export async function calculateAndStoreClientHealth(
  clientId: string,
  locationId: string | null,
  agencyId: string
): Promise<{ id: string; score: number; band: HealthBand; calculated_at: string } | null> {
  const result = await calculateClientHealth(clientId, locationId, agencyId)
  const supabase = await createClient()
  const factorsJson = result.factors as unknown as Record<string, unknown>
  const { data, error } = await supabase
    .from('health_scores')
    .insert({
      agency_id: agencyId,
      client_id: clientId,
      location_id: locationId || null,
      score: result.score,
      band: result.band,
      factors: factorsJson,
    })
    .select('id, score, band, calculated_at')
    .single()
  if (error) {
    console.error('health_scores insert error:', error)
    return null
  }
  return data
}
