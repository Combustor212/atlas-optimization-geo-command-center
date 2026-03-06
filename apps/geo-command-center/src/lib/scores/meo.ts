/**
 * MEO Score: Map/Entity Optimization
 * - Increased weight on ranking history + coverage (rankings table)
 * - Review velocity and rating trend (reviews table)
 * - Reduced pure "completeness" contribution
 */

import type { PillarMeta, ScoreBreakdown } from './types'

export interface MEOScoreInput {
  /** Avg map pack position (best of recent) */
  avgMapPackPosition?: number | null
  /** Ranking history: days with data in last 30 */
  rankingCoverageDays?: number
  /** Rank trend: (prev - curr) / prev, positive = improving */
  rankTrend30d?: number | null
  /** Review count (latest) */
  reviewCount?: number | null
  /** Review velocity: new reviews in last 30d vs previous 30d */
  reviewVelocityTrend?: number | null
  /** Rating trend: current avg vs previous period */
  ratingTrend?: number | null
  /** Profile completeness 0-1 (reduced weight) */
  completeness?: number | null
}

export function computeMEOScore(input: MEOScoreInput): {
  score: number
  meta: PillarMeta
} {
  const factors: ScoreBreakdown['factors'] = []
  const dataSources: string[] = []

  // Ranking: 0-40 pts (increased from previous)
  let rankingScore = 0
  if (input.avgMapPackPosition != null) {
    const pos = input.avgMapPackPosition
    rankingScore =
      pos <= 1 ? 35 :
      pos <= 2 ? 30 :
      pos <= 3 ? 25 :
      pos <= 5 ? 20 :
      pos <= 10 ? 12 : 5
    factors.push({ label: 'Map pack position', value: rankingScore, weight: 0.4 })
    dataSources.push('rankings')
  }

  // Ranking coverage + history: 0-15 pts
  const coverageDays = input.rankingCoverageDays ?? 0
  const coverageScore = Math.min(15, (coverageDays / 30) * 15)
  factors.push({ label: 'Ranking history coverage', value: coverageScore, weight: 0.15 })
  if (coverageDays > 0) dataSources.push('rankings')

  // Rank trend: 0-15 pts
  const trend = input.rankTrend30d ?? 0
  const trendScore = Math.min(15, Math.max(0, (trend + 0.5) * 15))
  factors.push({ label: 'Rank trend (30d)', value: trendScore, weight: 0.15 })

  // Review velocity: 0-15 pts
  const velTrend = input.reviewVelocityTrend ?? 0
  const velScore = Math.min(15, Math.max(0, (velTrend + 0.5) * 15))
  factors.push({ label: 'Review velocity trend', value: velScore, weight: 0.15 })
  if (input.reviewCount != null) dataSources.push('reviews')

  // Rating trend: 0-10 pts (reduced)
  const ratingTrend = input.ratingTrend ?? 0
  const ratingScore = Math.min(10, Math.max(0, (ratingTrend + 0.5) * 10))
  factors.push({ label: 'Rating trend', value: ratingScore, weight: 0.1 })

  // Completeness: 0-5 pts (reduced from previous)
  const comp = input.completeness ?? 0
  const compScore = comp * 5
  factors.push({ label: 'Profile completeness', value: compScore, weight: 0.05 })

  const total = rankingScore + coverageScore + trendScore + velScore + ratingScore + compScore
  const score = Math.min(100, Math.round(total))

  const hasTimeSeries = (input.rankingCoverageDays ?? 0) >= 14
  const hasReviews = (input.reviewCount ?? 0) > 0

  return {
    score,
    meta: {
      confidence: hasTimeSeries && hasReviews ? 'high' : hasTimeSeries || hasReviews ? 'medium' : 'low',
      breakdown: { factors, dataSources: [...new Set(dataSources)] },
      why: hasTimeSeries
        ? 'Based on ranking history and review trends'
        : 'Connect ranking tracking for higher confidence',
    },
  }
}
