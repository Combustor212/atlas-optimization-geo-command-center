import type { SupabaseClient } from '@supabase/supabase-js'
import type { UpsellCondition } from './types'

const LOCATION_METRICS = ['avg_rank', 'calls_monthly', 'ai_visibility_score'] as const
const CLIENT_METRICS = ['health_band'] as const

export function isLocationMetric(metric: string): metric is (typeof LOCATION_METRICS)[number] {
  return LOCATION_METRICS.includes(metric as (typeof LOCATION_METRICS)[number])
}

export function isClientMetric(metric: string): metric is (typeof CLIENT_METRICS)[number] {
  return CLIENT_METRICS.includes(metric as (typeof CLIENT_METRICS)[number])
}

function compare(op: string, actual: number | string, target: number | string): boolean {
  const a = typeof actual === 'string' ? actual : actual
  const b = typeof target === 'string' ? target : target
  if (typeof a === 'string' && typeof b === 'string') {
    switch (op) {
      case '=': return a === b
      case '!=': return a !== b
      default: return false
    }
  }
  const an = typeof a === 'number' ? a : parseFloat(String(a))
  const bn = typeof b === 'number' ? b : parseFloat(String(b))
  if (Number.isNaN(an) || Number.isNaN(bn)) return false
  switch (op) {
    case '<=': return an <= bn
    case '>=': return an >= bn
    case '<': return an < bn
    case '>': return an > bn
    case '=': return an === bn
    default: return false
  }
}

/** Fetch avg_rank for a location over windowDays (avg of map_pack_position or organic_position). */
async function getAvgRank(
  supabase: SupabaseClient,
  locationId: string,
  windowDays: number
): Promise<number | null> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - windowDays)
  const { data } = await supabase
    .from('rankings')
    .select('map_pack_position, organic_position')
    .eq('location_id', locationId)
    .gte('recorded_at', cutoff.toISOString())
  if (!data || data.length === 0) return null
  const positions = data
    .map((r) => r.map_pack_position ?? r.organic_position ?? null)
    .filter((p): p is number => p != null)
  if (positions.length === 0) return null
  return positions.reduce((s, p) => s + p, 0) / positions.length
}

/** Fetch calls_monthly for a location over windowDays. */
async function getCallsMonthly(
  supabase: SupabaseClient,
  locationId: string,
  windowDays: number
): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - windowDays)
  const { data } = await supabase
    .from('calls_tracked')
    .select('call_count')
    .eq('location_id', locationId)
    .gte('recorded_at', cutoff.toISOString().slice(0, 10))
  if (!data) return 0
  return data.reduce((s, row) => s + (row.call_count ?? 0), 0)
}

/** Fetch ai_visibility_score for a location over windowDays (avg visibility_score where is_mentioned). */
async function getAIVisibilityScore(
  supabase: SupabaseClient,
  locationId: string,
  windowDays: number
): Promise<number | null> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - windowDays)
  const { data } = await supabase
    .from('generative_ai_visibility')
    .select('visibility_score')
    .eq('location_id', locationId)
    .eq('is_mentioned', true)
    .gte('recorded_at', cutoff.toISOString())
  if (!data || data.length === 0) return null
  return data.reduce((s, r) => s + (r.visibility_score ?? 0), 0) / data.length
}

/** Fetch health_band for a client (latest health_scores row). */
async function getHealthBand(
  supabase: SupabaseClient,
  clientId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('health_scores')
    .select('band')
    .eq('client_id', clientId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.band ?? null
}

/** Evaluate a single condition against a (client, location) pair. */
export async function evaluateCondition(
  supabase: SupabaseClient,
  condition: UpsellCondition,
  clientId: string,
  locationId: string | null
): Promise<boolean> {
  const { metric, op, value, windowDays = 30 } = condition

  if (isLocationMetric(metric)) {
    if (!locationId) return false
    let actual: number | string | null = null
    if (metric === 'avg_rank') {
      actual = await getAvgRank(supabase, locationId, windowDays)
    } else if (metric === 'calls_monthly') {
      actual = await getCallsMonthly(supabase, locationId, windowDays)
    } else if (metric === 'ai_visibility_score') {
      actual = await getAIVisibilityScore(supabase, locationId, windowDays)
    }
    if (actual == null && metric !== 'calls_monthly') return false
    return compare(op, actual ?? 0, value)
  }

  if (isClientMetric(metric)) {
    if (metric === 'health_band') {
      const band = await getHealthBand(supabase, clientId)
      if (!band) return false
      return compare(op, band, String(value))
    }
  }

  return false
}
