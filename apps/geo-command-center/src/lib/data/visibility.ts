import { createClient } from '@/lib/supabase/server'
import { GenerativeAIVisibility, SearchVisibility, VisibilityGrowthMetrics } from '@/types/database'

/**
 * Get AI visibility metrics for a location
 */
export async function getAIVisibilityForLocation(
  locationId: string,
  days: number = 30
): Promise<GenerativeAIVisibility[]> {
  const supabase = await createClient()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const { data, error } = await supabase
    .from('generative_ai_visibility')
    .select('*')
    .eq('location_id', locationId)
    .gte('recorded_at', cutoffDate.toISOString())
    .order('recorded_at', { ascending: false })

  if (error) {
    console.error('Error fetching AI visibility:', error)
    return []
  }

  return data || []
}

/**
 * Get search visibility metrics for a location
 */
export async function getSearchVisibilityForLocation(
  locationId: string,
  days: number = 30
): Promise<SearchVisibility[]> {
  const supabase = await createClient()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const { data, error } = await supabase
    .from('search_visibility')
    .select('*')
    .eq('location_id', locationId)
    .gte('recorded_at', cutoffDate.toISOString())
    .order('recorded_at', { ascending: false })

  if (error) {
    console.error('Error fetching search visibility:', error)
    return []
  }

  return data || []
}

/**
 * Get AI visibility summary for a location
 */
export async function getAIVisibilitySummary(locationId: string, days: number = 30) {
  const metrics = await getAIVisibilityForLocation(locationId, days)
  
  if (metrics.length === 0) {
    return {
      avgScore: 0,
      mentionCount: 0,
      platforms: [],
      trend: 'stable' as const,
      recentScore: 0,
      previousScore: 0,
    }
  }

  const mentionedMetrics = metrics.filter(m => m.is_mentioned)
  const avgScore = mentionedMetrics.length > 0
    ? mentionedMetrics.reduce((sum, m) => sum + m.visibility_score, 0) / mentionedMetrics.length
    : 0

  const platforms = [...new Set(metrics.map(m => m.platform))]
  
  // Calculate trend (compare first half vs second half of period)
  const midpoint = Math.floor(metrics.length / 2)
  const recentMetrics = metrics.slice(0, midpoint).filter(m => m.is_mentioned)
  const olderMetrics = metrics.slice(midpoint).filter(m => m.is_mentioned)
  
  const recentScore = recentMetrics.length > 0
    ? recentMetrics.reduce((sum, m) => sum + m.visibility_score, 0) / recentMetrics.length
    : 0
  const previousScore = olderMetrics.length > 0
    ? olderMetrics.reduce((sum, m) => sum + m.visibility_score, 0) / olderMetrics.length
    : 0

  let trend: 'growth' | 'stable' | 'decline' = 'stable'
  if (recentScore > previousScore * 1.1) trend = 'growth'
  else if (recentScore < previousScore * 0.9) trend = 'decline'

  return {
    avgScore: Math.round(avgScore * 10) / 10,
    mentionCount: mentionedMetrics.length,
    platforms,
    trend,
    recentScore: Math.round(recentScore * 10) / 10,
    previousScore: Math.round(previousScore * 10) / 10,
  }
}

/**
 * Get search visibility summary for a location
 */
export async function getSearchVisibilitySummary(locationId: string, days: number = 30) {
  const metrics = await getSearchVisibilityForLocation(locationId, days)
  
  if (metrics.length === 0) {
    return {
      avgScore: 0,
      avgPosition: null,
      serpFeatureCoverage: 0,
      localPackAppearances: 0,
      featuredSnippets: 0,
      knowledgePanels: 0,
      trend: 'stable' as const,
      recentScore: 0,
      previousScore: 0,
    }
  }

  const visibleMetrics = metrics.filter(m => m.is_visible)
  const avgScore = visibleMetrics.length > 0
    ? visibleMetrics.reduce((sum, m) => sum + m.overall_visibility_score, 0) / visibleMetrics.length
    : 0

  const positionedMetrics = metrics.filter(m => m.position !== null)
  const avgPosition = positionedMetrics.length > 0
    ? positionedMetrics.reduce((sum, m) => sum + (m.position || 0), 0) / positionedMetrics.length
    : null

  // Calculate SERP feature coverage
  const totalFeatures = 5 // featured_snippet, knowledge_panel, local_pack, image_pack, video_result
  const featureSum = metrics.reduce((sum, m) => {
    return sum + 
      (m.has_featured_snippet ? 1 : 0) +
      (m.has_knowledge_panel ? 1 : 0) +
      (m.has_local_pack ? 1 : 0) +
      (m.has_image_pack ? 1 : 0) +
      (m.has_video_result ? 1 : 0)
  }, 0)
  const serpFeatureCoverage = metrics.length > 0
    ? (featureSum / (metrics.length * totalFeatures)) * 100
    : 0

  const localPackAppearances = metrics.filter(m => m.has_local_pack).length
  const featuredSnippets = metrics.filter(m => m.has_featured_snippet).length
  const knowledgePanels = metrics.filter(m => m.has_knowledge_panel).length

  // Calculate trend
  const midpoint = Math.floor(metrics.length / 2)
  const recentMetrics = metrics.slice(0, midpoint).filter(m => m.is_visible)
  const olderMetrics = metrics.slice(midpoint).filter(m => m.is_visible)
  
  const recentScore = recentMetrics.length > 0
    ? recentMetrics.reduce((sum, m) => sum + m.overall_visibility_score, 0) / recentMetrics.length
    : 0
  const previousScore = olderMetrics.length > 0
    ? olderMetrics.reduce((sum, m) => sum + m.overall_visibility_score, 0) / olderMetrics.length
    : 0

  let trend: 'growth' | 'stable' | 'decline' = 'stable'
  if (recentScore > previousScore * 1.1) trend = 'growth'
  else if (recentScore < previousScore * 0.9) trend = 'decline'

  return {
    avgScore: Math.round(avgScore * 10) / 10,
    avgPosition: avgPosition ? Math.round(avgPosition * 10) / 10 : null,
    serpFeatureCoverage: Math.round(serpFeatureCoverage * 10) / 10,
    localPackAppearances,
    featuredSnippets,
    knowledgePanels,
    trend,
    recentScore: Math.round(recentScore * 10) / 10,
    previousScore: Math.round(previousScore * 10) / 10,
  }
}

/**
 * Get visibility growth metrics for all locations in an agency
 */
export async function getVisibilityGrowthMetrics(
  agencyId: string,
  days: number = 30
): Promise<VisibilityGrowthMetrics[]> {
  const supabase = await createClient()

  // Get all locations for the agency
  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .eq('agency_id', agencyId)

  if (!clients || clients.length === 0) {
    return []
  }

  const clientIds = clients.map(c => c.id)
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name')
    .in('client_id', clientIds)

  if (!locations || locations.length === 0) {
    return []
  }

  // Get visibility metrics for each location
  const results: VisibilityGrowthMetrics[] = []
  
  for (const location of locations) {
    const [aiSummary, searchSummary] = await Promise.all([
      getAIVisibilitySummary(location.id, days),
      getSearchVisibilitySummary(location.id, days),
    ])

    const combinedScore = (aiSummary.avgScore + searchSummary.avgScore) / 2

    results.push({
      location_id: location.id,
      location_name: location.name,
      ai_visibility_score: aiSummary.avgScore,
      ai_mention_count: aiSummary.mentionCount,
      ai_trend: aiSummary.trend,
      search_visibility_score: searchSummary.avgScore,
      serp_feature_coverage: searchSummary.serpFeatureCoverage,
      search_trend: searchSummary.trend,
      combined_visibility_score: Math.round(combinedScore * 10) / 10,
      last_updated: new Date().toISOString(),
    })
  }

  return results
}

/**
 * Get AI visibility trend data for charts (by platform)
 */
export async function getAIVisibilityTrendData(locationId: string, days: number = 30) {
  const metrics = await getAIVisibilityForLocation(locationId, days)
  
  // Group by date and platform
  const dataByDate = metrics.reduce((acc, metric) => {
    const date = new Date(metric.recorded_at).toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = {
        date,
        chatgpt: [],
        gemini: [],
        perplexity: [],
        claude: [],
        other: [],
      }
    }
    if (metric.is_mentioned) {
      acc[date][metric.platform].push(metric.visibility_score)
    }
    return acc
  }, {} as Record<string, { date: string; chatgpt: number[]; gemini: number[]; perplexity: number[]; claude: number[]; other: number[] }>)

  // Calculate averages
  return Object.values(dataByDate).map((day) => ({
    date: day.date,
    chatgpt: day.chatgpt.length > 0 ? day.chatgpt.reduce((a: number, b: number) => a + b, 0) / day.chatgpt.length : 0,
    gemini: day.gemini.length > 0 ? day.gemini.reduce((a: number, b: number) => a + b, 0) / day.gemini.length : 0,
    perplexity: day.perplexity.length > 0 ? day.perplexity.reduce((a: number, b: number) => a + b, 0) / day.perplexity.length : 0,
    claude: day.claude.length > 0 ? day.claude.reduce((a: number, b: number) => a + b, 0) / day.claude.length : 0,
    other: day.other.length > 0 ? day.other.reduce((a: number, b: number) => a + b, 0) / day.other.length : 0,
  })).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Get search visibility trend data for charts
 */
export async function getSearchVisibilityTrendData(locationId: string, days: number = 30) {
  const metrics = await getSearchVisibilityForLocation(locationId, days)
  
  // Group by date
  const dataByDate = metrics.reduce((acc, metric) => {
    const date = new Date(metric.recorded_at).toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = {
        date,
        scores: [],
        positions: [],
      }
    }
    if (metric.is_visible) {
      acc[date].scores.push(metric.overall_visibility_score)
      if (metric.position) {
        acc[date].positions.push(metric.position)
      }
    }
    return acc
  }, {} as Record<string, { date: string; scores: number[]; positions: number[] }>)

  // Calculate averages
  return Object.values(dataByDate).map((day) => ({
    date: day.date,
    visibility_score: day.scores.length > 0 
      ? Math.round((day.scores.reduce((a: number, b: number) => a + b, 0) / day.scores.length) * 10) / 10
      : 0,
    avg_position: day.positions.length > 0
      ? Math.round((day.positions.reduce((a: number, b: number) => a + b, 0) / day.positions.length) * 10) / 10
      : null,
  })).sort((a, b) => a.date.localeCompare(b.date))
}
