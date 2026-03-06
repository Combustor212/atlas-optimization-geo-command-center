import type { SupabaseClient } from '@supabase/supabase-js'

export type HealthBand = 'healthy' | 'watch' | 'risk'

export interface HealthFactors {
  avg_rank?: { value: number; normalized: number; weight: number; label: string }
  review_velocity?: { value: number; normalized: number; weight: number; label: string }
  call_volume?: { value: number; normalized: number; weight: number; label: string }
  traffic_trend?: { value: number; normalized: number; weight: number; label: string }
}

export interface HealthResult {
  score: number
  band: HealthBand
  factors: HealthFactors
}

const WEIGHTS = {
  avg_rank: 0.4,
  review_velocity: 0.3,
  call_volume: 0.2,
  traffic_trend: 0.1,
}

/** Normalize rank (lower is better): 1 => 100, 20 => 0. */
function rankToScore(rank: number): number {
  if (rank <= 0) return 0
  if (rank >= 20) return 0
  return Math.max(0, 100 - (rank - 1) * (100 / 19))
}

/** Normalize review velocity (reviews/day): 0 => 0, 2+ => 100. */
function velocityToScore(perDay: number): number {
  return Math.min(100, Math.round(perDay * 50))
}

/** Normalize calls/month: 0 => 0, 50+ => 100. */
function callsToScore(calls: number): number {
  return Math.min(100, Math.round(calls * 2))
}

/** Band from score. */
function scoreToBand(score: number): HealthBand {
  if (score >= 70) return 'healthy'
  if (score >= 40) return 'watch'
  return 'risk'
}

/**
 * Compute health score for a client+location. Uses rankings, reviews, calls, traffic.
 */
export async function computeHealthScore(
  supabase: SupabaseClient,
  agencyId: string,
  clientId: string,
  locationId: string | null
): Promise<HealthResult> {
  const factors: HealthFactors = {}
  let totalWeight = 0
  let weightedSum = 0

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)

  if (locationId) {
    const { data: ranks } = await supabase
      .from('rankings')
      .select('map_pack_position, organic_position')
      .eq('location_id', locationId)
      .gte('recorded_at', cutoff.toISOString())

    const positions = (ranks ?? [])
      .map((r) => r.map_pack_position ?? r.organic_position ?? null)
      .filter((p): p is number => p != null)
    const avgRank = positions.length ? positions.reduce((s, p) => s + p, 0) / positions.length : null
    if (avgRank != null) {
      const norm = rankToScore(avgRank)
      factors.avg_rank = { value: avgRank, normalized: norm, weight: WEIGHTS.avg_rank, label: 'Avg Rank (30d)' }
      weightedSum += norm * WEIGHTS.avg_rank
      totalWeight += WEIGHTS.avg_rank
    }

    const { data: reviews } = await supabase
      .from('reviews')
      .select('count, recorded_at')
      .eq('location_id', locationId)
      .gte('recorded_at', cutoff.toISOString().slice(0, 10))
      .order('recorded_at', { ascending: false })

    const revCounts = (reviews ?? []).map((r) => r.count ?? 0)
    const velocity = revCounts.length >= 2
      ? Math.abs(revCounts[0] - revCounts[revCounts.length - 1]) / 30
      : revCounts[0] ? revCounts[0] / 30 : 0
    const velNorm = velocityToScore(velocity)
    factors.review_velocity = { value: velocity, normalized: velNorm, weight: WEIGHTS.review_velocity, label: 'Review Velocity' }
    weightedSum += velNorm * WEIGHTS.review_velocity
    totalWeight += WEIGHTS.review_velocity

    const { data: calls } = await supabase
      .from('calls_tracked')
      .select('call_count')
      .eq('location_id', locationId)
      .gte('recorded_at', cutoff.toISOString().slice(0, 10))

    const callTotal = (calls ?? []).reduce((s, c) => s + (c.call_count ?? 0), 0)
    const callNorm = callsToScore(callTotal)
    factors.call_volume = { value: callTotal, normalized: callNorm, weight: WEIGHTS.call_volume, label: 'Calls (30d)' }
    weightedSum += callNorm * WEIGHTS.call_volume
    totalWeight += WEIGHTS.call_volume

    const { data: traffic } = await supabase
      .from('traffic_metrics')
      .select('organic_clicks')
      .eq('location_id', locationId)
      .gte('recorded_at', cutoff.toISOString().slice(0, 10))

    const trafficTotal = (traffic ?? []).reduce((s, t) => s + (t.organic_clicks ?? 0), 0)
    const trafficNorm = Math.min(100, Math.round(trafficTotal / 10))
    factors.traffic_trend = { value: trafficTotal, normalized: trafficNorm, weight: WEIGHTS.traffic_trend, label: 'Traffic (30d)' }
    weightedSum += trafficNorm * WEIGHTS.traffic_trend
    totalWeight += WEIGHTS.traffic_trend
  }

  const score = totalWeight > 0 ? Math.round((weightedSum / totalWeight)) : 50
  const band = scoreToBand(score)

  return { score: Math.max(0, Math.min(100, score)), band, factors }
}
