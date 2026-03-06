/**
 * SEO Score: Based on AI queries (ai_mentions), search_visibility, and rankings
 * - High confidence: ai_mentions + search_visibility (both have data)
 * - Medium confidence: ai_mentions OR search_visibility
 * - Low confidence: rankings fallback only
 * No GSC/OAuth required.
 */

import type { PillarMeta, ScoreBreakdown } from './types'

export interface SEOScoreInput {
  /** From ai_mentions (AI query results) */
  aiMentionsAvgScore?: number | null
  aiMentionsCount?: number
  aiMentionsPlatforms?: number
  /** From search_visibility (organic, featured snippet, etc.) */
  searchVisibilityAvgScore?: number | null
  searchVisibilityAvgPosition?: number | null
  searchVisibilityCount?: number
  serpFeatureCoverage?: number | null
  /** Fallback: top 5 keywords from rankings */
  topKeywordsAvgPosition?: number | null
  topKeywordsCount?: number
}

function computeFromAISearch(
  aiScore: number,
  aiCount: number,
  aiPlatforms: number,
  searchScore: number | null,
  searchPosition: number | null,
  searchCount: number,
  serpCoverage: number | null
): { score: number; breakdown: ScoreBreakdown; dataSources: string[] } {
  const factors: ScoreBreakdown['factors'] = []
  const dataSources: string[] = []

  // AI query visibility (0-45 pts) - primary source
  if (aiCount > 0) {
    const aiScoreNorm = Math.min(100, aiScore)
    const aiPlatformBonus = Math.min(10, aiPlatforms * 3)
    const aiPts = Math.round((aiScoreNorm / 100) * 35) + aiPlatformBonus
    factors.push({ label: 'AI query visibility', value: Math.min(45, aiPts), weight: 0.45 })
    dataSources.push('ai_mentions')
  }

  // Search visibility (0-55 pts when no AI, else up to 40) - organic, featured snippets, etc.
  if (searchScore != null && searchScore > 0) {
    const pts = Math.round((searchScore / 100) * (aiCount > 0 ? 25 : 35))
    factors.push({ label: 'Search visibility score', value: pts, weight: 0.3 })
    dataSources.push('search_visibility')
  }
  if (searchPosition != null && searchPosition > 0 && searchPosition < 100) {
    const posPts =
      searchPosition <= 3 ? 15 :
      searchPosition <= 5 ? 12 :
      searchPosition <= 10 ? 8 : 4
    factors.push({ label: 'Avg search position', value: posPts, weight: 0.15 })
    if (!dataSources.includes('search_visibility')) dataSources.push('search_visibility')
  }
  if (serpCoverage != null && serpCoverage > 0) {
    const serpPts = Math.min(15, (serpCoverage / 100) * 15)
    factors.push({ label: 'SERP feature coverage', value: serpPts, weight: 0.1 })
  }

  const total = factors.reduce((s, f) => s + f.value, 0)
  const score = Math.min(100, Math.round(total))

  return {
    score,
    breakdown: { factors, dataSources },
    dataSources: [...new Set(dataSources)],
  }
}

function computeFromRankingsOnly(
  topKeywordsAvgPosition: number | null,
  topKeywordsCount: number
): { score: number; breakdown: ScoreBreakdown } {
  const pos = topKeywordsAvgPosition ?? 50
  const coverageBonus = Math.min(15, topKeywordsCount * 3)
  const posScore =
    pos <= 3 ? 70 :
    pos <= 5 ? 60 :
    pos <= 10 ? 50 :
    pos <= 20 ? 35 : 20
  const score = Math.min(100, Math.round(posScore + coverageBonus))
  return {
    score,
    breakdown: {
      factors: [
        { label: 'Top keyword visibility', value: posScore, weight: 0.85 },
        { label: 'Keyword coverage', value: coverageBonus, weight: 0.15 },
      ],
      dataSources: ['rankings'],
    },
  }
}

export function computeSEOScore(input: SEOScoreInput): {
  score: number
  meta: PillarMeta
} {
  const hasAI = (input.aiMentionsCount ?? 0) > 0 && (input.aiMentionsAvgScore ?? 0) > 0
  const hasSearch =
    (input.searchVisibilityCount ?? 0) > 0 &&
    ((input.searchVisibilityAvgScore ?? 0) > 0 || (input.searchVisibilityAvgPosition ?? 100) < 100)

  if (hasAI || hasSearch) {
    const { score, breakdown, dataSources } = computeFromAISearch(
      input.aiMentionsAvgScore ?? 0,
      input.aiMentionsCount ?? 0,
      input.aiMentionsPlatforms ?? 0,
      input.searchVisibilityAvgScore ?? null,
      input.searchVisibilityAvgPosition ?? null,
      input.searchVisibilityCount ?? 0,
      input.serpFeatureCoverage ?? null
    )
    const confidence = hasAI && hasSearch ? 'high' : 'medium'
    return {
      score,
      meta: {
        confidence,
        breakdown,
        why:
          confidence === 'high'
            ? 'Based on AI query results and search visibility data'
            : hasAI
              ? 'Based on AI query results (add search visibility for higher confidence)'
              : 'Based on search visibility (add AI queries for higher confidence)',
      },
    }
  }

  const { score, breakdown } = computeFromRankingsOnly(
    input.topKeywordsAvgPosition ?? null,
    input.topKeywordsCount ?? 0
  )
  return {
    score,
    meta: {
      confidence: 'low',
      breakdown,
      why: 'Based on keyword rankings only. Add AI queries and search visibility for better scores.',
    },
  }
}
