/**
 * GEO AI Visibility - Generative Engine Optimization scoring
 *
 * Measures how likely a business is to be referenced by AI systems
 * (ChatGPT, Google SGE, Perplexity). NOT based on local map rankings.
 *
 * Runs unified GEO v2 + v3 + v4 + v5 engines plus Competitor AI Visibility Comparison.
 */
import {
  computeGEOScore,
  type GEOInput,
  type GEOScoreOutput,
  type GEOv2Query,
  type GEOQueryEvidenceItem,
} from './geoScoring'
import { fetchGeoCompetitors } from './geoCompetitors'

// Map Google Places types to category labels
const TYPE_TO_INDUSTRY: Record<string, string> = {
  cafe: 'coffee shop',
  coffee_shop: 'coffee shop',
  restaurant: 'restaurant',
  bar: 'bar',
  bakery: 'bakery',
  gym: 'gym',
  spa: 'spa',
  hair_care: 'hair salon',
  beauty_salon: 'beauty salon',
  dentist: 'dentist',
  doctor: 'doctor',
  lawyer: 'lawyer',
  real_estate_agency: 'real estate',
  plumber: 'plumber',
  car_repair: 'auto repair',
  barber_shop: 'barber',
  store: 'store',
  pharmacy: 'pharmacy',
  veterinary_care: 'veterinarian',
  lodging: 'hotel',
}

/** GEO v5 AI Discovery Opportunity (optional, present when v5 engine runs) */
export interface GEOv5OpportunityData {
  aiDiscoveryVolumeEstimate: number
  aiVisibilityGap: number
  potentialAIVisitsLost: number
  potentialCustomersLost: number
  monthlyRevenueOpportunity: number
  annualRevenueOpportunity: number
  opportunityScore: number
  opportunityExplanation: string
}

export interface GEOExplainData {
  version: 'v3'
  generatedAt: string
  geoScore: number
  grade: string
  authorityScore: number
  contentDepth: number
  reviewAuthority: number
  entityConsistency: number
  answerability: number
  entityStrengthScore: number
  aiMentionProbability: number
  entityCoverageScore?: number
  entityCoverageExplanation?: string
  queriesTested: number
  mentionsDetected: number
  averagePosition: number | null
  aiVisibilityProbability: number
  topCompetitorsMentioned: string[]
  explanation: string
  deficiencies: string[]
  optimizationRecommendations: string[]
  components: Array<{ name: string; score: number; max: number; label: string }>
  queries: Array<{ query: string; bucket: string; mentioned: boolean; rank: number | null; reason: string | null }>
  stats: { queriesTested: number; mentions: number; top3: number; avgRankMentioned: number | null }
  percentile: number
  nicheLabel: string
  locationLabel: string
  industryClassification?: { industry: string; confidence: number }
  /** GEO v5 AI Discovery & Revenue Opportunity */
  opportunity?: GEOv5OpportunityData
  /** Competitor AI Visibility Comparison */
  competitorGeoScores?: Array<{ name: string; geoScore: number; aiVisibilityProbability: number }>
  competitorAverageGeoScore?: number
  competitorAverageAiVisibility?: number
  visibilityGap?: number
  competitorNames?: string[]
  competitorComparisonInsight?: string
  /** AI Query Evidence — transparent evidence of simulated AI answers */
  queryEvidence?: GEOQueryEvidenceItem[]
  queryEvidenceInsight?: string
  /** Average confidence across all query simulations (0–100) */
  averageConfidenceScore?: number
  /** Identifies this as a simulation model, not live data */
  simulationType: string
  /** User-facing disclaimer about simulation nature */
  simulationDisclaimer: string
}

function resolveIndustry(placeTypes: string[] | undefined): string {
  if (!placeTypes?.length) return 'local business'
  for (const t of placeTypes) {
    const label = TYPE_TO_INDUSTRY[t]
    if (label) return label
  }
  return 'local business'
}

// Known national/international brands get conservative authority boost
const KNOWN_BRANDS = new Set(
  [
    'starbucks', 'mcdonald', 'chipotle', 'subway', 'dunkin', 'panera',
    'best buy', 'walmart', 'target', 'costco', 'home depot', 'lowes',
    'cvs', 'walgreens', 'kroger', 'publix', 'whole foods', 'aldi',
    'apple', 'tesla', 'amazon', 'google', 'microsoft',
  ].map((s) => s.toLowerCase())
)

function isKnownBrand(name: string): boolean {
  const lower = String(name || '').toLowerCase()
  return [...KNOWN_BRANDS].some((b) => lower.includes(b))
}

function placeToGEOInput(place: Record<string, unknown>, locationStr: string): GEOInput {
  const name = (place.name as string) || 'Unknown Business'
  const address = (place.formatted_address as string) || locationStr || ''
  const types = (place.types as string[]) || []
  const category = resolveIndustry(types)
  const editorialSummary = place.editorial_summary as { overview?: string } | undefined
  const description = editorialSummary?.overview || null

  return {
    businessName: name,
    fullAddress: address,
    website: (place.website as string) || null,
    rating: typeof place.rating === 'number' ? place.rating : null,
    totalReviews: typeof place.user_ratings_total === 'number' ? place.user_ratings_total : null,
    category,
    description,
    knownBrandSignals: isKnownBrand(name) ? ['recognized brand name'] : null,
    socialProfiles: null,
    citations: null,
    contentSignals: place.website ? ['has website'] : null,
  }
}

export async function runGeoAIVisibility(
  place: Record<string, unknown>,
  locationStr: string,
  openaiKey: string,
  options?: { googlePlacesApiKey?: string }
): Promise<GEOExplainData | null> {
  if (!openaiKey?.trim()) return null

  const input = placeToGEOInput(place, locationStr)

  // Fetch competitors when we have geometry and Google Places API key
  const geometry = place.geometry as { location?: { lat: number; lng: number } } | undefined
  const lat = geometry?.location?.lat
  const lng = geometry?.location?.lng
  const placeId = place.place_id as string | undefined
  const apiKey = options?.googlePlacesApiKey || process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY

  if (apiKey && placeId && typeof lat === 'number' && typeof lng === 'number' && input.category) {
    try {
      const competitors = await fetchGeoCompetitors(
        { apiKey },
        {
          targetPlaceId: placeId,
          targetName: input.businessName,
          lat,
          lng,
          category: input.category,
          locationLabel: locationStr,
        }
      )
      if (competitors.length >= 1) {
        input.competitors = competitors.map((c) => ({
          name: c.name,
          address: c.address,
          rating: c.rating,
          totalReviews: c.totalReviews,
          website: c.website,
          hasWebsite: c.hasWebsite ?? !!c.website,
          category: c.category,
        }))
      }
    } catch (err) {
      console.error('[GEO AI Visibility] Competitor fetch failed:', err)
    }
  }

  const result = await computeGEOScore(input, openaiKey)
  if (!result) return null

  return formatExplainData(result, place, locationStr)
}

function formatExplainData(
  output: GEOScoreOutput,
  place: Record<string, unknown>,
  locationStr: string
): GEOExplainData {
  const types = (place.types as string[]) || []
  const nicheLabel = resolveIndustry(types)
  const address = (place.formatted_address as string) || locationStr || ''

  const components = [
    { name: 'Authority', score: output.authorityScore, max: 30, label: 'Brand authority & citations' },
    { name: 'Content Depth', score: output.contentDepth, max: 20, label: 'Structured information online' },
    { name: 'Review Sentiment', score: output.reviewAuthority, max: 20, label: 'Trust from reviews' },
    { name: 'Entity Consistency', score: output.entityConsistency, max: 15, label: 'NAP consistency across web' },
    { name: 'AI Answerability', score: output.answerability, max: 15, label: 'Ease for AI to describe/recommend' },
  ]

  // Use real GEO v2 query simulation results; fallback to recommendations if empty
  const queries: GEOExplainData['queries'] =
    output.v2Queries.length > 0
      ? output.v2Queries.map((q: GEOv2Query) => ({
          query: q.query,
          bucket: q.bucket,
          mentioned: q.mentioned,
          rank: q.rank,
          reason: q.reason,
        }))
      : output.optimizationRecommendations.map((rec) => ({
          query: rec,
          bucket: 'recommendation' as const,
          mentioned: true,
          rank: null as number | null,
          reason: null as string | null,
        }))

  const mentionedWithRank = queries.filter((q) => q.mentioned && q.rank != null)
  const top3 = mentionedWithRank.filter((q) => q.rank != null && q.rank <= 3).length
  const avgRankMentioned =
    mentionedWithRank.length > 0
      ? Math.round((mentionedWithRank.reduce((s, q) => s + (q.rank ?? 0), 0) / mentionedWithRank.length) * 10) / 10
      : null

  const percentile = Math.min(99, Math.max(5, Math.round(40 + (output.geoScore / 100) * 55)))

  const opportunity: GEOv5OpportunityData | undefined =
    output.aiDiscoveryVolumeEstimate != null &&
    output.aiVisibilityGap != null &&
    output.potentialAIVisitsLost != null &&
    output.potentialCustomersLost != null &&
    output.monthlyRevenueOpportunity != null &&
    output.annualRevenueOpportunity != null &&
    output.opportunityScore != null &&
    output.opportunityExplanation != null
      ? {
          aiDiscoveryVolumeEstimate: output.aiDiscoveryVolumeEstimate,
          aiVisibilityGap: output.aiVisibilityGap,
          potentialAIVisitsLost: output.potentialAIVisitsLost,
          potentialCustomersLost: output.potentialCustomersLost,
          monthlyRevenueOpportunity: output.monthlyRevenueOpportunity,
          annualRevenueOpportunity: output.annualRevenueOpportunity,
          opportunityScore: output.opportunityScore,
          opportunityExplanation: output.opportunityExplanation,
        }
      : undefined

  return {
    version: 'v3',
    generatedAt: new Date().toISOString(),
    geoScore: output.geoScore,
    grade: output.grade,
    authorityScore: output.authorityScore,
    contentDepth: output.contentDepth,
    reviewAuthority: output.reviewAuthority,
    entityConsistency: output.entityConsistency,
    answerability: output.answerability,
    entityStrengthScore: output.entityStrengthScore,
    aiMentionProbability: output.aiMentionProbability,
    entityCoverageScore: output.entityCoverageScore,
    entityCoverageExplanation: output.entityCoverageExplanation,
    queriesTested: output.queriesTested,
    mentionsDetected: output.mentionsDetected,
    averagePosition: output.averagePosition,
    aiVisibilityProbability: output.aiVisibilityProbability,
    topCompetitorsMentioned: output.topCompetitorsMentioned,
    explanation: output.explanation,
    deficiencies: output.deficiencies,
    optimizationRecommendations: output.optimizationRecommendations,
    components,
    queries,
    stats: {
      queriesTested: output.queriesTested,
      mentions: output.mentionsDetected,
      top3,
      avgRankMentioned,
    },
    percentile,
    nicheLabel,
    locationLabel: address,
    industryClassification: { industry: nicheLabel, confidence: 0.8 },
    opportunity,
    competitorGeoScores: output.competitorGeoScores,
    competitorAverageGeoScore: output.competitorAverageGeoScore,
    competitorAverageAiVisibility: output.competitorAverageAiVisibility,
    visibilityGap: output.visibilityGap,
    competitorNames: output.competitorNames,
    competitorComparisonInsight: output.competitorComparisonInsight,
    queryEvidence: output.queryEvidence,
    queryEvidenceInsight: output.queryEvidenceInsight,
    averageConfidenceScore: output.averageConfidenceScore,
    simulationType: output.simulationType ?? 'simulated_ai_visibility',
    simulationDisclaimer: output.simulationDisclaimer ?? 'This result estimates likelihood of AI recommendation and is not a live ranking.',
  }
}
