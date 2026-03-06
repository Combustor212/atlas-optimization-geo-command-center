/**
 * Unified MEO/SEO/GEO scoring with confidence model
 *
 * Confidence rules:
 * - High: has verified data source(s) + time-series
 * - Medium: partial data sources
 * - Low: heuristic-only
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface ScoreBreakdown {
  /** Top contributing factors with labels and values */
  factors: Array<{ label: string; value: number; weight: number }>
  /** Data sources used (e.g. gsc, rankings, ai_mentions) */
  dataSources: string[]
}

export interface PillarMeta {
  confidence: ConfidenceLevel
  breakdown: ScoreBreakdown
  /** Human-readable "why" for tooltip */
  why?: string
}

export interface UnifiedScoreResult {
  scores: {
    meo: number
    seo: number
    geo: number
    overall: number
    final: number
  }
  score_meta: {
    meo: PillarMeta
    seo: PillarMeta
    geo: PillarMeta
  }
  /** GEO marked Beta until 30+ days of data */
  geoBeta?: boolean
}
