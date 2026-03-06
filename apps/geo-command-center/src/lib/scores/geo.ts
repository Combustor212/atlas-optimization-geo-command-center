/**
 * GEO Score: Generative Engine Optimization
 * - Consistency + mention rank + cross-provider agreement from ai_mentions
 * - Marked Beta until 30+ days of data
 */

import type { PillarMeta, ScoreBreakdown } from './types'

export interface AIMentionInput {
  platform: string
  visibility_score: number
  /** 1-based position/rank in AI response (from evidence) */
  mention_position?: number | null
  captured_at: string
  evidence?: { mention_position?: number } | null
}

export interface GEOScoreInput {
  mentions: AIMentionInput[]
  /** Days of data available */
  dataDays?: number
}

export function computeGEOScore(input: GEOScoreInput): {
  score: number
  meta: PillarMeta
  geoBeta: boolean
} {
  const mentions = input.mentions ?? []
  const dataDays = input.dataDays ?? 0
  const geoBeta = dataDays < 30

  if (mentions.length === 0) {
    return {
      score: 0,
      meta: {
        confidence: 'low',
        breakdown: {
          factors: [],
          dataSources: [],
        },
        why: 'No AI mention data yet. Run AI queries to capture visibility.',
      },
      geoBeta: true,
    }
  }

  const factors: ScoreBreakdown['factors'] = []
  const platforms = [...new Set(mentions.map((m) => m.platform))]

  // Consistency: appearing across providers (0-35 pts)
  const providerCount = platforms.length
  const consistencyScore = Math.min(35, providerCount * 12)
  factors.push({ label: 'Cross-provider consistency', value: consistencyScore, weight: 0.35 })

  // Avg visibility score (0-35 pts)
  const avgVis =
    mentions.reduce((s, m) => s + m.visibility_score, 0) / mentions.length
  const visScore = Math.min(35, (avgVis / 100) * 35)
  factors.push({ label: 'Mention visibility', value: visScore, weight: 0.35 })

  // Mention rank/position: top positions score higher (0-30 pts)
  const withPosition = mentions.filter(
    (m) =>
      (m.mention_position != null && m.mention_position > 0) ||
      (m.evidence?.mention_position != null && m.evidence.mention_position > 0)
  )
  const avgPosition =
    withPosition.length > 0
      ? withPosition.reduce(
          (s, m) => s + (m.mention_position ?? m.evidence?.mention_position ?? 10),
          0
        ) / withPosition.length
      : null

  const rankScore =
    avgPosition != null
      ? avgPosition <= 1
        ? 30
        : avgPosition <= 2
          ? 25
          : avgPosition <= 3
            ? 20
            : avgPosition <= 5
              ? 15
              : 8
      : 15 // default when no position data
  factors.push({ label: 'Mention rank', value: rankScore, weight: 0.3 })

  const total = consistencyScore + visScore + rankScore
  const score = Math.min(100, Math.round(total))

  const hasTimeSeries = dataDays >= 30
  const hasPositionData = withPosition.length > 0

  return {
    score,
    meta: {
      confidence: hasTimeSeries && hasPositionData ? 'high' : hasTimeSeries ? 'medium' : 'low',
      breakdown: {
        factors,
        dataSources: ['ai_mentions'],
      },
      why: geoBeta
        ? 'Beta: 30+ days of data needed for full confidence'
        : 'Based on AI mention consistency and rank across providers',
    },
    geoBeta,
  }
}
