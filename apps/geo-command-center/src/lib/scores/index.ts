/**
 * Unified MEO/SEO/GEO scoring
 */

import { createClient } from '@/lib/supabase/server'
import { computeMEOScore } from './meo'
import { computeSEOScore } from './seo'
import { computeGEOScore } from './geo'
import type { UnifiedScoreResult } from './types'

export * from './types'
export { computeMEOScore } from './meo'
export { computeSEOScore } from './seo'
export { computeGEOScore } from './geo'

export interface ComputeUnifiedScoresInput {
  clientId: string
  locationId?: string | null
  agencyId: string
}

export async function computeUnifiedScores(
  input: ComputeUnifiedScoresInput
): Promise<UnifiedScoreResult> {
  const supabase = await createClient()
  const { clientId, locationId, agencyId } = input

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
  const start30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const start60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const cutoff30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const cutoff90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()

  // Run independent data fetches in parallel
  const [
    { data: rankings },
    { data: reviews },
    { data: aiMentionsForSeo },
    { data: searchVisibility },
    { data: aiMentions },
  ] = await Promise.all([
    supabase
      .from('rankings')
      .select('location_id, map_pack_position, organic_position, recorded_at, keyword')
      .in('location_id', locationIds)
      .gte('recorded_at', start60)
      .order('recorded_at', { ascending: false }),
    supabase
      .from('reviews')
      .select('location_id, count, avg_rating, recorded_at')
      .in('location_id', locationIds)
      .gte('recorded_at', start60),
    supabase
      .from('ai_mentions')
      .select('platform, visibility_score, captured_at')
      .in('location_id', locationIds)
      .gte('captured_at', cutoff30),
    supabase
      .from('search_visibility')
      .select('position, overall_visibility_score, has_featured_snippet, has_knowledge_panel, has_local_pack')
      .in('location_id', locationIds)
      .gte('recorded_at', cutoff30),
    supabase
      .from('ai_mentions')
      .select('platform, visibility_score, captured_at, evidence')
      .in('location_id', locationIds)
      .gte('captured_at', cutoff90),
  ])

  const rankRows = rankings || []
  const recentRank = rankRows.filter((r) => r.recorded_at && r.recorded_at.slice(0, 10) >= start30)
  const prevRank = rankRows.filter(
    (r) => r.recorded_at && r.recorded_at.slice(0, 10) >= start60 && r.recorded_at.slice(0, 10) < start30
  )

  const positions = recentRank.map((r) => r.map_pack_position ?? r.organic_position ?? 100).filter((p) => p != null)
  const top5 = positions.slice(0, 5)
  const avgMapPack =
    top5.length > 0 ? top5.reduce((a, b) => a + b, 0) / top5.length : null

  const uniqueDays = new Set(recentRank.map((r) => r.recorded_at?.slice(0, 10)).filter(Boolean)).size
  const prevAvg =
    prevRank.length > 0
      ? prevRank.reduce((s, r) => s + (r.map_pack_position ?? r.organic_position ?? 100), 0) / prevRank.length
      : null
  const currAvg = positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : null
  const rankTrend =
    prevAvg != null && currAvg != null && prevAvg > 0 ? (prevAvg - currAvg) / prevAvg : null

  const reviewRows = reviews || []
  const recentReviews = reviewRows.filter((r) => r.recorded_at && r.recorded_at.slice(0, 10) >= start30)
  const prevReviews = reviewRows.filter(
    (r) => r.recorded_at && r.recorded_at.slice(0, 10) >= start60 && r.recorded_at.slice(0, 10) < start30
  )
  const reviewRecent = recentReviews.reduce((s, r) => s + (r.count ?? 0), 0)
  const reviewPrev = prevReviews.reduce((s, r) => s + (r.count ?? 0), 0)
  const reviewVelocityTrend = reviewPrev > 0 ? (reviewRecent - reviewPrev) / reviewPrev : reviewRecent > 0 ? 1 : null
  const ratingRecent =
    recentReviews.length > 0
      ? recentReviews.reduce((s, r) => s + (r.avg_rating ?? 0), 0) / recentReviews.length
      : null
  const ratingPrev =
    prevReviews.length > 0
      ? prevReviews.reduce((s, r) => s + (r.avg_rating ?? 0), 0) / prevReviews.length
      : null
  const ratingTrend =
    ratingPrev != null && ratingRecent != null && ratingPrev > 0
      ? (ratingRecent - ratingPrev) / ratingPrev
      : null

  const aiMentionRows = aiMentionsForSeo || []
  const aiMentionsAvgScore =
    aiMentionRows.length > 0
      ? aiMentionRows.reduce((s, m) => s + (m.visibility_score ?? 0), 0) / aiMentionRows.length
      : null
  const aiMentionsPlatforms = new Set(aiMentionRows.map((m) => m.platform)).size

  const searchRows = searchVisibility || []
  const searchVisible = searchRows.filter((r) => (r.overall_visibility_score ?? 0) > 0 || (r.position ?? 100) < 100)
  const searchVisibilityAvgScore =
    searchVisible.length > 0
      ? searchVisible.reduce((s, r) => s + (r.overall_visibility_score ?? 0), 0) / searchVisible.length
      : null
  const searchVisibilityAvgPosition =
    searchVisible.length > 0
      ? searchVisible.reduce((s, r) => s + (r.position ?? 100), 0) / searchVisible.length
      : null
  const serpFeatureCount = searchRows.reduce(
    (s, r) =>
      s +
      (r.has_featured_snippet ? 1 : 0) +
      (r.has_knowledge_panel ? 1 : 0) +
      (r.has_local_pack ? 1 : 0),
    0
  )
  const serpFeatureCoverage = searchRows.length > 0 ? (serpFeatureCount / (searchRows.length * 3)) * 100 : null

  // Fallback: generative_ai_visibility if no ai_mentions
  let aiScoreForSeo = aiMentionsAvgScore
  let aiCountForSeo = aiMentionRows.length
  if (aiCountForSeo === 0) {
    const { data: genAI } = await supabase
      .from('generative_ai_visibility')
      .select('visibility_score')
      .in('location_id', locationIds)
      .gte('recorded_at', cutoff30)
    const genRows = genAI || []
    const mentioned = genRows.filter((r) => (r.visibility_score ?? 0) > 0)
    if (mentioned.length > 0) {
      aiScoreForSeo = mentioned.reduce((s, r) => s + (r.visibility_score ?? 0), 0) / mentioned.length
      aiCountForSeo = mentioned.length
    }
  }

  // SEO: based on AI queries + search visibility, fallback to rankings
  const seoResult = computeSEOScore({
    aiMentionsAvgScore: aiScoreForSeo,
    aiMentionsCount: aiCountForSeo,
    aiMentionsPlatforms,
    searchVisibilityAvgScore,
    searchVisibilityAvgPosition,
    searchVisibilityCount: searchRows.length,
    serpFeatureCoverage,
    topKeywordsAvgPosition: avgMapPack,
    topKeywordsCount: Math.min(5, top5.length),
  })

  // MEO
  const meoResult = computeMEOScore({
    avgMapPackPosition: avgMapPack,
    rankingCoverageDays: uniqueDays,
    rankTrend30d: rankTrend,
    reviewCount: reviewRecent || reviewPrev || 0,
    reviewVelocityTrend,
    ratingTrend,
    completeness: 0.8, // TODO: compute from profile fields
  })

  const mentionRows = (aiMentions || []).map((m) => ({
    platform: m.platform,
    visibility_score: m.visibility_score ?? 0,
    mention_position: (m.evidence as { mention_position?: number } | null)?.mention_position ?? null,
    captured_at: m.captured_at ?? '',
    evidence: m.evidence as { mention_position?: number } | null,
  }))

  const firstMention = mentionRows[0]?.captured_at
  const dataDays = firstMention
    ? Math.floor((now.getTime() - new Date(firstMention).getTime()) / (24 * 60 * 60 * 1000))
    : 0

  const geoResult = computeGEOScore({
    mentions: mentionRows,
    dataDays,
  })

  // Overall: weighted average (MEO 35%, SEO 40%, GEO 25%)
  const overall =
    Math.round(
      meoResult.score * 0.35 + seoResult.score * 0.4 + geoResult.score * 0.25
    )
  const final = Math.min(100, Math.max(0, overall))

  return {
    scores: {
      meo: meoResult.score,
      seo: seoResult.score,
      geo: geoResult.score,
      overall,
      final,
    },
    score_meta: {
      meo: meoResult.meta,
      seo: seoResult.meta,
      geo: geoResult.meta,
    },
    geoBeta: geoResult.geoBeta,
  }
}
