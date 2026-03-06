import { createClient } from '@/lib/supabase/server'
import type { ReviewForecast } from '@/types/database'
import { getLatestReviewSnapshot } from './competitors'

const FORECAST_WINDOW_DAYS = 90
const MODEL_VERSION = 'linear_v1'

export interface ComputeForecastInput {
  locationId: string
  agencyId: string
  clientId: string
  competitorId?: string | null
}

export interface ComputedForecast {
  current_review_count: number
  current_velocity_per_day: number
  projected_review_count: number
  goal_review_count: number | null
  estimated_date_to_goal: string | null
  velocity_window_days: number
}

/**
 * Get review snapshots for a location from the reviews table (last N days)
 */
async function getLocationReviewSnapshots(
  locationId: string,
  days: number
): Promise<{ count: number; recorded_at: string }[]> {
  const supabase = await createClient()
  const start = new Date()
  start.setDate(start.getDate() - days)
  const startStr = start.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('reviews')
    .select('count, recorded_at')
    .eq('location_id', locationId)
    .gte('recorded_at', startStr)
    .order('recorded_at', { ascending: true })

  if (error) return []
  return data ?? []
}

/**
 * Compute velocity (reviews per day) from snapshots in a window.
 * Returns { velocity, currentCount } or null if insufficient data.
 */
function velocityFromWindow(
  snapshots: { count: number; recorded_at: string }[],
  windowDays: number
): { velocity: number; currentCount: number } | null {
  if (snapshots.length < 2) return null

  const now = new Date()
  const windowStart = new Date(now)
  windowStart.setDate(windowStart.getDate() - windowDays)
  const windowStartTime = windowStart.getTime()

  const inWindow = snapshots.filter(
    (s) => new Date(s.recorded_at).getTime() >= windowStartTime
  )
  if (inWindow.length < 2) return null

  const oldest = inWindow[0]
  const newest = inWindow[inWindow.length - 1]
  const currentCount = newest.count
  const daysBetween =
    (new Date(newest.recorded_at).getTime() - new Date(oldest.recorded_at).getTime()) /
    (1000 * 60 * 60 * 24)
  if (daysBetween <= 0) return null

  const velocity = Math.max(0, (newest.count - oldest.count) / daysBetween)
  return { velocity, currentCount }
}

/**
 * Compute forecast from location reviews. Prefer 30d window, fallback 60d, then 90d.
 */
export async function computeLocationForecast(
  input: ComputeForecastInput
): Promise<ComputedForecast> {
  const snapshots = await getLocationReviewSnapshots(input.locationId, 90)
  let velocity = 0
  let currentCount = 0
  let velocityWindowDays = 0

  for (const window of [30, 60, 90]) {
    const result = velocityFromWindow(snapshots, window)
    if (result) {
      velocity = result.velocity
      currentCount = result.currentCount
      velocityWindowDays = window
      break
    }
  }

  // If no window had enough data, use latest snapshot count and zero velocity
  if (velocityWindowDays === 0 && snapshots.length > 0) {
    const latest = snapshots[snapshots.length - 1]
    currentCount = latest.count
  }

  const projected = Math.round(
    currentCount + velocity * FORECAST_WINDOW_DAYS
  )

  let goal_review_count: number | null = null
  let estimated_date_to_goal: string | null = null

  if (input.competitorId) {
    const snapshot = await getLatestReviewSnapshot(input.competitorId)
    if (snapshot?.review_count != null) {
      goal_review_count = snapshot.review_count + 1
      if (velocity > 0 && currentCount < goal_review_count) {
        const daysToGoal = (goal_review_count - currentCount) / velocity
        const date = new Date()
        date.setDate(date.getDate() + daysToGoal)
        estimated_date_to_goal = date.toISOString()
      }
    }
  }

  return {
    current_review_count: currentCount,
    current_velocity_per_day: Math.round(velocity * 100) / 100,
    projected_review_count: projected,
    goal_review_count,
    estimated_date_to_goal,
    velocity_window_days: velocityWindowDays,
  }
}

/**
 * Persist a computed forecast to review_forecasts.
 */
export async function saveReviewForecast(
  input: ComputeForecastInput,
  computed: ComputedForecast
): Promise<ReviewForecast | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('review_forecasts')
    .insert({
      agency_id: input.agencyId,
      client_id: input.clientId,
      location_id: input.locationId,
      competitor_id: input.competitorId || null,
      forecast_window_days: FORECAST_WINDOW_DAYS,
      model_version: MODEL_VERSION,
      current_review_count: computed.current_review_count,
      current_velocity_per_day: computed.current_velocity_per_day,
      projected_review_count: computed.projected_review_count,
      goal_review_count: computed.goal_review_count,
      estimated_date_to_goal: computed.estimated_date_to_goal,
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving review forecast:', error)
    return null
  }

  return data as ReviewForecast
}

/**
 * Get the latest forecast for a location.
 */
export async function getLatestReviewForecast(
  locationId: string
): Promise<ReviewForecast | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('review_forecasts')
    .select('*')
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching review forecast:', error)
    return null
  }

  return data as ReviewForecast | null
}
