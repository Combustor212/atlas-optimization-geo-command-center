import { createClient } from '@/lib/supabase/server'
import { Competitor, CompetitorRankSnapshot, CompetitorReviewSnapshot, CompetitorWithSnapshots } from '@/types/database'

/**
 * Get all competitors for a location with latest snapshots
 */
export async function getLocationCompetitors(locationId: string): Promise<CompetitorWithSnapshots[]> {
  const supabase = await createClient()

  // Get competitors
  const { data: competitors, error: compError } = await supabase
    .from('competitors')
    .select('*')
    .eq('location_id', locationId)
    .order('is_primary', { ascending: false })
    .order('name')

  if (compError || !competitors) {
    console.error('Error fetching competitors:', compError)
    return []
  }

  // Get latest snapshots for each competitor
  const results: CompetitorWithSnapshots[] = []

  for (const competitor of competitors) {
    const [rankSnapshot, reviewSnapshot, rankHistory, reviewHistory, velocity] = await Promise.all([
      getLatestRankSnapshot(competitor.id),
      getLatestReviewSnapshot(competitor.id),
      getRankHistory(competitor.id, 30),
      getReviewHistory(competitor.id, 90),
      getReviewVelocity(competitor.id),
    ])

    // Calculate rank trend
    const rankTrend = calculateRankTrend(rankHistory)

    results.push({
      competitor,
      latest_rank: rankSnapshot,
      latest_review: reviewSnapshot,
      review_velocity: velocity,
      rank_trend: rankTrend,
      rank_history: rankHistory,
      review_history: reviewHistory,
    })
  }

  return results
}

/**
 * Get latest rank snapshot for a competitor
 */
export async function getLatestRankSnapshot(competitorId: string): Promise<CompetitorRankSnapshot | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('competitor_rank_snapshots')
    .select('*')
    .eq('competitor_id', competitorId)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching rank snapshot:', error)
    return null
  }

  return data
}

/**
 * Get latest review snapshot for a competitor
 */
export async function getLatestReviewSnapshot(competitorId: string): Promise<CompetitorReviewSnapshot | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('competitor_review_snapshots')
    .select('*')
    .eq('competitor_id', competitorId)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching review snapshot:', error)
    return null
  }

  return data
}

/**
 * Get rank history for a competitor
 */
export async function getRankHistory(competitorId: string, days: number = 30): Promise<CompetitorRankSnapshot[]> {
  const supabase = await createClient()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const { data, error } = await supabase
    .from('competitor_rank_snapshots')
    .select('*')
    .eq('competitor_id', competitorId)
    .gte('captured_at', cutoffDate.toISOString())
    .order('captured_at', { ascending: true })

  if (error) {
    console.error('Error fetching rank history:', error)
    return []
  }

  return data || []
}

/**
 * Get review history for a competitor
 */
export async function getReviewHistory(competitorId: string, days: number = 90): Promise<CompetitorReviewSnapshot[]> {
  const supabase = await createClient()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const { data, error } = await supabase
    .from('competitor_review_snapshots')
    .select('*')
    .eq('competitor_id', competitorId)
    .gte('captured_at', cutoffDate.toISOString())
    .order('captured_at', { ascending: true})

  if (error) {
    console.error('Error fetching review history:', error)
    return []
  }

  return data || []
}

/**
 * Calculate review velocity (reviews per day)
 */
export async function getReviewVelocity(competitorId: string): Promise<number> {
  const history = await getReviewHistory(competitorId, 60)
  
  if (history.length < 2) return 0

  // Get most recent and 30 days ago
  const recent = history[history.length - 1]
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Find snapshot closest to 30 days ago
  const older = history.reduce((prev, curr) => {
    const prevDiff = Math.abs(new Date(prev.captured_at).getTime() - thirtyDaysAgo.getTime())
    const currDiff = Math.abs(new Date(curr.captured_at).getTime() - thirtyDaysAgo.getTime())
    return currDiff < prevDiff ? curr : prev
  })

  const reviewDelta = recent.review_count - older.review_count
  const daysDelta = Math.max(1, Math.floor((new Date(recent.captured_at).getTime() - new Date(older.captured_at).getTime()) / (1000 * 60 * 60 * 24)))

  return Math.max(0, reviewDelta / daysDelta)
}

/**
 * Calculate rank trend (up/down/stable)
 */
function calculateRankTrend(rankHistory: CompetitorRankSnapshot[]): 'up' | 'down' | 'stable' {
  if (rankHistory.length < 2) return 'stable'

  const recent = rankHistory.slice(-3)
  const older = rankHistory.slice(0, Math.min(3, rankHistory.length - 3))

  if (older.length === 0) return 'stable'

  const recentAvg = recent.reduce((sum, r) => sum + r.rank_position, 0) / recent.length
  const olderAvg = older.reduce((sum, r) => sum + r.rank_position, 0) / older.length

  // Lower rank position is better (rank 1 > rank 10)
  if (recentAvg < olderAvg * 0.9) return 'up' // Improved rank
  if (recentAvg > olderAvg * 1.1) return 'down' // Worse rank
  return 'stable'
}

/**
 * Get a single competitor by ID
 */
export async function getCompetitor(competitorId: string): Promise<Competitor | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('id', competitorId)
    .single()

  if (error) {
    console.error('Error fetching competitor:', error)
    return null
  }

  return data
}

/**
 * Get competitor comparison data for location
 */
export async function getCompetitorComparison(locationId: string) {
  const competitors = await getLocationCompetitors(locationId)

  // Calculate averages and rankings
  const avgRating = competitors.reduce((sum, c) => sum + (c.latest_review?.rating || 0), 0) / competitors.length || 0
  const avgReviewCount = competitors.reduce((sum, c) => sum + (c.latest_review?.review_count || 0), 0) / competitors.length || 0
  const avgRank = competitors.reduce((sum, c) => sum + (c.latest_rank?.rank_position || 999), 0) / competitors.length || 0

  // Sort by various metrics
  const topRated = [...competitors].sort((a, b) => (b.latest_review?.rating || 0) - (a.latest_review?.rating || 0))[0]
  const mostReviews = [...competitors].sort((a, b) => (b.latest_review?.review_count || 0) - (a.latest_review?.review_count || 0))[0]
  const topRanked = [...competitors].sort((a, b) => (a.latest_rank?.rank_position || 999) - (b.latest_rank?.rank_position || 999))[0]

  return {
    competitors,
    summary: {
      total: competitors.length,
      avgRating: Math.round(avgRating * 10) / 10,
      avgReviewCount: Math.round(avgReviewCount),
      avgRank: Math.round(avgRank * 10) / 10,
    },
    top: {
      topRated,
      mostReviews,
      topRanked,
    },
  }
}
