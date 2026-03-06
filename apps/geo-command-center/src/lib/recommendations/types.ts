/**
 * Recommendation Action Engine - Types
 * Prepared for optional OpenAI-written descriptions (off by default)
 */

export const RECOMMENDATION_TYPES = [
  'reviews',
  'gmb',
  'content',
  'citations',
  'technical',
  'ai_visibility',
  'search_visibility',
] as const

export type RecommendationType = (typeof RECOMMENDATION_TYPES)[number]

export const RECOMMENDATION_SEVERITIES = ['low', 'medium', 'high'] as const

export type RecommendationSeverity = (typeof RECOMMENDATION_SEVERITIES)[number]

export const RECOMMENDATION_STATUSES = ['open', 'in_progress', 'done', 'dismissed'] as const

export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number]

export interface ExpectedImpact {
  metric?: string
  estimated_lift?: number
  timeframe?: string
  confidence?: 'low' | 'medium' | 'high'
}

export interface RecommendationInput {
  agency_id: string
  client_id: string
  location_id: string
  type: RecommendationType
  severity: RecommendationSeverity
  title: string
  description: string
  expected_impact?: ExpectedImpact
  created_by?: 'system' | 'staff'
}

/**
 * Input signals for rule-based generator.
 * All optional - generator tolerates missing data.
 */
export interface GeneratorInput {
  latest_rank?: number | null
  rank_trend_30d?: number | null // e.g. +10% improvement or -5% decline
  review_velocity?: number // reviews per day (30d)
  rating?: number | null
  traffic_trend?: 'growth' | 'stable' | 'decline'
  calls_trend?: 'growth' | 'stable' | 'decline'
  ai_visibility_score?: number
  search_visibility_score?: number
  competitor_review_velocity_higher?: boolean
  competitor_delta_reviews?: number // how many more reviews competitors gained
}

/**
 * Optional: OpenAI can enrich descriptions.
 * Keep OFF by default; can be enabled later.
 */
export type OpenAIEnrichment = {
  enabled: false
} | {
  enabled: true
  apiKey: string
  model?: string
}
