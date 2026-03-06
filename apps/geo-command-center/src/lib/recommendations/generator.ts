/**
 * Recommendation Action Engine - Rule-based Generator
 * Input: rank, rank trend, review velocity, rating, traffic/calls trends, AI/search visibility, competitor deltas
 * Output: 3-10 recommendations (deduplicated by type/title)
 * Prepared for optional OpenAI-written descriptions (OFF by default)
 */

import type {
  GeneratorInput,
  RecommendationInput,
  RecommendationSeverity,
} from './types'

const REVIEW_VELOCITY_THRESHOLD = 0.1 // reviews per day
const RATING_LOW_THRESHOLD = 4.3
const AI_VISIBILITY_LOW_THRESHOLD = 40
const SEARCH_VISIBILITY_LOW_THRESHOLD = 40
const RANK_HIGH_THRESHOLD = 3 // worse than rank 3

/**
 * Build recommendations from rule-based logic.
 * Deduplicates by (type, title) and returns 3-10 items.
 */
export function generateRecommendations(
  input: GeneratorInput,
  context: { agency_id: string; client_id: string; location_id: string }
): RecommendationInput[] {
  const recs: RecommendationInput[] = []

  // Rule: rank > 3 and review_velocity < threshold => recommend review campaign
  if (
    (input.latest_rank == null || input.latest_rank > RANK_HIGH_THRESHOLD) &&
    (input.review_velocity == null || input.review_velocity < REVIEW_VELOCITY_THRESHOLD)
  ) {
    recs.push({
      ...context,
      type: 'reviews',
      severity: input.latest_rank != null && input.latest_rank > 5 ? 'high' : 'medium',
      title: 'Launch a review campaign',
      description:
        'Ranking above the top 3 with low review velocity. Reviews strongly influence local pack rankings. Implement a systematic review request flow (post-service, email/SMS) to build social proof.',
      expected_impact: {
        metric: 'local_pack_rank',
        estimated_lift: 1,
        timeframe: '30-60 days',
        confidence: 'medium',
      },
    })
  }

  // Rule: rating < 4.3 => recommend service recovery flow
  if (input.rating != null && input.rating < RATING_LOW_THRESHOLD) {
    recs.push({
      ...context,
      type: 'reviews',
      severity: input.rating < 4.0 ? 'high' : 'medium',
      title: 'Prioritize service recovery and reputation',
      description:
        `Average rating (${input.rating.toFixed(1)}) is below the 4.3 threshold many searchers use to filter. Focus on resolving negative feedback, improving service delivery, and encouraging happy customers to leave reviews.`,
      expected_impact: {
        metric: 'avg_rating',
        estimated_lift: 0.3,
        timeframe: '60-90 days',
        confidence: 'medium',
      },
    })
  }

  // Rule: ai_visibility_score low => recommend structured FAQ + entity content
  if (
    input.ai_visibility_score != null &&
    input.ai_visibility_score < AI_VISIBILITY_LOW_THRESHOLD
  ) {
    recs.push({
      ...context,
      type: 'ai_visibility',
      severity: input.ai_visibility_score < 20 ? 'high' : 'medium',
      title: 'Add structured FAQ and entity-rich content',
      description:
        'AI visibility score is low. AI assistants favor well-structured, factual content. Add FAQ schema, entity-focused pages, and clear business details (services, hours, areas served) to improve mentions in AI search.',
      expected_impact: {
        metric: 'ai_visibility_score',
        estimated_lift: 15,
        timeframe: '60-90 days',
        confidence: 'low',
      },
    })
  }

  // Rule: search_visibility_score low => recommend schema + snippet targeting
  if (
    input.search_visibility_score != null &&
    input.search_visibility_score < SEARCH_VISIBILITY_LOW_THRESHOLD
  ) {
    recs.push({
      ...context,
      type: 'search_visibility',
      severity: input.search_visibility_score < 20 ? 'high' : 'medium',
      title: 'Improve schema and snippet targeting',
      description:
        'Search visibility score is low. Implement LocalBusiness schema, optimize meta descriptions and titles for featured snippets, and ensure NAP consistency across citations.',
      expected_impact: {
        metric: 'search_visibility_score',
        estimated_lift: 20,
        timeframe: '60-90 days',
        confidence: 'medium',
      },
    })
  }

  // Rule: competitor review velocity higher => recommend photo + review push
  if (input.competitor_review_velocity_higher) {
    const extra =
      input.competitor_delta_reviews != null
        ? ` Competitors gained ~${Math.round(input.competitor_delta_reviews)} more reviews in the last 30 days.`
        : ''
    recs.push({
      ...context,
      type: 'gmb',
      severity: 'high',
      title: 'Boost GMB photos and review collection',
      description: `Competitors are outpacing you on reviews.${extra} Add fresh photos regularly and ramp up review requests. Visual content and review volume both influence local rankings.`,
      expected_impact: {
        metric: 'reviews_per_month',
        estimated_lift: 5,
        timeframe: '30 days',
        confidence: 'medium',
      },
    })
  }

  // Additional rule: rank declining (rank_trend negative) => content + citations
  if (input.rank_trend_30d != null && input.rank_trend_30d < -5) {
    recs.push({
      ...context,
      type: 'content',
      severity: input.rank_trend_30d < -15 ? 'high' : 'medium',
      title: 'Refresh content and build authority',
      description:
        'Rank trend is declining. Update service pages, add location-specific content, and strengthen topical authority. Consider new blog posts or service expansion content.',
      expected_impact: {
        metric: 'rank',
        estimated_lift: 1,
        timeframe: '60-90 days',
        confidence: 'low',
      },
    })
  }

  // Low-traffic or declining traffic => technical + citations
  if (input.traffic_trend === 'decline' || input.calls_trend === 'decline') {
    recs.push({
      ...context,
      type: 'technical',
      severity: 'medium',
      title: 'Audit site performance and citations',
      description:
        'Traffic or calls are declining. Check Core Web Vitals, mobile usability, and NAP consistency across citations. Fix any indexing or crawl issues.',
      expected_impact: {
        metric: 'organic_traffic',
        estimated_lift: 10,
        timeframe: '30-60 days',
        confidence: 'low',
      },
    })
  }

  // Baseline: citations best practice if we have few recs
  if (recs.length < 4) {
    recs.push({
      ...context,
      type: 'citations',
      severity: 'low',
      title: 'Verify and expand citation consistency',
      description:
        'Ensure NAP (Name, Address, Phone) is identical across all directories and your website. Inconsistent citations can hurt local rankings.',
      expected_impact: {
        metric: 'local_rank',
        estimated_lift: 0.5,
        timeframe: '30-60 days',
        confidence: 'medium',
      },
    })
  }

  return deduplicateRecommendations(recs).slice(0, 10)
}

/**
 * Deduplicate by (type, title) and prefer higher severity.
 */
/**
 * Optional: Enrich recommendation descriptions using OpenAI.
 * OFF by default. Enable by setting env OPENAI_RECOMMENDATIONS_ENRICH=true and providing API key.
 *
 * @example
 * // Future usage (when enabled):
 * const enriched = await enrichWithOpenAI(recs, { enabled: true, apiKey: process.env.OPENAI_API_KEY })
 */
export async function enrichWithOpenAI(
  _recs: RecommendationInput[],
  _config: { enabled: false } | { enabled: true; apiKey: string; model?: string }
): Promise<RecommendationInput[]> {
  if (_config.enabled === false) return _recs
  // When enabled: call OpenAI to rewrite/expand descriptions; return enriched recs
  // Placeholder - implement when ready
  return _recs
}

function deduplicateRecommendations(recs: RecommendationInput[]): RecommendationInput[] {
  const severityOrder: Record<RecommendationSeverity, number> = {
    high: 3,
    medium: 2,
    low: 1,
  }
  const seen = new Map<string, RecommendationInput>()
  for (const r of recs) {
    const key = `${r.type}:${r.title}`
    const existing = seen.get(key)
    if (!existing || severityOrder[r.severity] > severityOrder[existing.severity]) {
      seen.set(key, r)
    }
  }
  return Array.from(seen.values())
}
