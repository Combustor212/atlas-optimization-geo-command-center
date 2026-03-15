/**
 * GEO v5 — AI Discovery & Revenue Opportunity Modeling
 *
 * Estimates AI discovery opportunity and potential revenue impact using
 * results from GEO v2 (query simulation), v3 (structural), v4 (entity authority).
 *
 * Conservative estimates only. No guaranteed results.
 */

import type { GEOBenchmarkResponse } from './geoSchema';
import type { GEOExplainStats } from './queryEvaluator';

export interface GEOv5Opportunity {
  aiDiscoveryVolumeEstimate: number
  aiVisibilityGap: number
  potentialAIVisitsLost: number
  potentialCustomersLost: number
  monthlyRevenueOpportunity: number
  annualRevenueOpportunity: number
  opportunityScore: number
  opportunityExplanation: string
}

/** Category demand tiers with approximate monthly search volume ranges */
const DEMAND_TIERS: Record<string, { min: number; max: number; conversion: number }> = {
  restaurant: { min: 800, max: 2400, conversion: 0.05 },
  cafe: { min: 400, max: 1200, conversion: 0.04 },
  coffee_shop: { min: 400, max: 1200, conversion: 0.04 },
  dentist: { min: 600, max: 1800, conversion: 0.04 },
  plumber: { min: 500, max: 1500, conversion: 0.05 },
  lawyer: { min: 300, max: 900, conversion: 0.03 },
  doctor: { min: 400, max: 1200, conversion: 0.03 },
  gym: { min: 300, max: 900, conversion: 0.04 },
  spa: { min: 200, max: 600, conversion: 0.05 },
  hair_salon: { min: 400, max: 1200, conversion: 0.05 },
  auto_repair: { min: 400, max: 1200, conversion: 0.05 },
  default: { min: 300, max: 900, conversion: 0.04 },
}

/** AI discovery share: 10–35% of searches influenced by AI depending on industry */
const AI_DISCOVERY_SHARE = 0.20
const EXPECTED_TOP_VISIBILITY = 0.70

/**
 * Compute GEO v5 opportunity from benchmark + query stats.
 * Uses conservative assumptions throughout.
 */
export function computeGeoV5Opportunity(
  benchmark: GEOBenchmarkResponse,
  stats: GEOExplainStats
): GEOv5Opportunity {
  const geoScore = benchmark.geoScore ?? 0
  const aiVisibilityProbability = stats.queriesTested > 0
    ? (stats.mentions / stats.queriesTested) * 100
    : geoScore
  const currentVisibility = aiVisibilityProbability / 100
  const aiVisibilityGap = Math.max(0, Math.min(1, EXPECTED_TOP_VISIBILITY - currentVisibility))

  const categoryKey = (benchmark.category?.key || benchmark.nicheCanonical || 'default')
    .toLowerCase()
    .replace(/\s+/g, '_')
  const tier = DEMAND_TIERS[categoryKey] ?? DEMAND_TIERS.default
  const aiDiscoveryVolumeEstimate = Math.round(
    ((tier.min + tier.max) / 2) * AI_DISCOVERY_SHARE
  )

  const potentialAIVisitsLost = Math.round(aiDiscoveryVolumeEstimate * aiVisibilityGap)
  const potentialCustomersLost = Math.round(potentialAIVisitsLost * tier.conversion)

  const target = benchmark.target
  const avgTicket = estimateAverageTicket(categoryKey, target)
  const monthlyRevenueOpportunity = Math.round(potentialCustomersLost * avgTicket)
  const annualRevenueOpportunity = monthlyRevenueOpportunity * 12

  const opportunityScore = computeOpportunityScore(
    aiVisibilityGap,
    tier,
    benchmark.drivers,
    geoScore
  )

  const opportunityExplanation = buildExplanation(
    potentialAIVisitsLost,
    aiVisibilityGap,
    opportunityScore
  )

  return {
    aiDiscoveryVolumeEstimate,
    aiVisibilityGap,
    potentialAIVisitsLost,
    potentialCustomersLost,
    monthlyRevenueOpportunity,
    annualRevenueOpportunity,
    opportunityScore,
    opportunityExplanation,
  }
}

function estimateAverageTicket(categoryKey: string, target: { types?: string[] }): number {
  const tickets: Record<string, number> = {
    restaurant: 45,
    cafe: 12,
    coffee_shop: 12,
    dentist: 180,
    plumber: 250,
    lawyer: 350,
    doctor: 120,
    gym: 65,
    spa: 95,
    hair_salon: 55,
    auto_repair: 200,
  }
  return tickets[categoryKey] ?? 75
}

function computeOpportunityScore(
  aiVisibilityGap: number,
  tier: { min: number; max: number },
  drivers: Array<{ status: string; pointGain: number }>,
  geoScore: number
): number {
  let score = 0

  const gapScore = Math.round(aiVisibilityGap * 40)
  score += Math.min(40, gapScore)

  const demandMid = (tier.min + tier.max) / 2
  const demandScore = demandMid > 1000 ? 25 : demandMid > 500 ? 15 : 10
  score += demandScore

  const badDrivers = drivers.filter((d) => d.status === 'bad').length
  const driverScore = Math.min(20, badDrivers * 5)
  score += driverScore

  const contentScore = geoScore < 50 ? 15 : geoScore < 70 ? 10 : 5
  score += contentScore

  return Math.max(0, Math.min(100, score))
}

function buildExplanation(
  potentialAIVisitsLost: number,
  aiVisibilityGap: number,
  opportunityScore: number
): string {
  const gapPct = Math.round(aiVisibilityGap * 100)
  if (potentialAIVisitsLost <= 0 || gapPct <= 5) {
    return 'Your current AI visibility is strong relative to typical local businesses. Maintaining entity signals, reviews, and structured content will help preserve your discoverability.'
  }
  const rangeLow = Math.max(0, Math.round(potentialAIVisitsLost * 0.7))
  const rangeHigh = Math.round(potentialAIVisitsLost * 1.3)
  return `Your current AI visibility suggests you may be missing approximately ${rangeLow}–${rangeHigh} discovery visits per month from AI-assisted searches. Improving entity signals, reviews, and structured content could significantly increase your chances of being referenced by AI systems.`
}
