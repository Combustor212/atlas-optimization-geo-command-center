import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { LocationMatchInfo } from '@/lib/ai/mention-extraction'

export type AIQueryPlatform = 'chatgpt' | 'gemini' | 'perplexity' | 'claude'
export type AIQueryFrequency = 'weekly' | 'monthly'
export type AIQueryRunStatus = 'queued' | 'completed' | 'failed'

export interface AIQuery {
  id: string
  agency_id: string
  location_id: string
  query_text: string
  platform: AIQueryPlatform
  frequency: AIQueryFrequency
  is_active: boolean
  created_at: string
}

export interface AIQueryRun {
  id: string
  agency_id: string
  ai_query_id: string
  status: AIQueryRunStatus
  ran_at: string
  raw_text: string | null
  extracted: Record<string, unknown>
  notes: string | null
  created_at: string
  ai_queries?: { query_text: string; platform: string; frequency: string; location_id: string } | null
  location?: { name: string; address: string | null; city: string | null; state: string | null; zip: string | null } | null
  client?: { business_name: string | null; phone: string | null } | null
}

export interface AIMention {
  id: string
  agency_id: string
  location_id: string
  platform: string
  mention_count: number
  visibility_score: number
  sentiment: 'positive' | 'neutral' | 'negative' | null
  captured_at: string
  evidence: Record<string, unknown>
  created_at: string
}

/**
 * Get location + client info for mention extraction (name, address, phone, etc.).
 * Use getLocationMatchInfoWithClient when you have a Supabase client (e.g. worker).
 */
export async function getLocationMatchInfoWithClient(
  supabase: SupabaseClient,
  locationId: string
): Promise<LocationMatchInfo | null> {
  const { data: location, error: locErr } = await supabase
    .from('locations')
    .select('id, name, address, city, state, zip, client_id, clients!inner(business_name, phone)')
    .eq('id', locationId)
    .single()

  if (locErr || !location) return null
  const loc = location as unknown as { name?: string; address?: string; city?: string; state?: string; zip?: string; clients?: { business_name: string | null; phone: string | null } | Array<{ business_name: string | null; phone: string | null }> }
  const client = Array.isArray(loc.clients) ? loc.clients[0] : loc.clients
  return {
    businessName: client?.business_name ?? null,
    locationName: loc.name ?? null,
    address: loc.address ?? null,
    city: loc.city ?? null,
    state: loc.state ?? null,
    zip: loc.zip ?? null,
    phone: client?.phone ?? null,
    website: null,
  }
}

/**
 * Get location + client info for mention extraction (name, address, phone, etc.)
 */
export async function getLocationMatchInfo(locationId: string): Promise<LocationMatchInfo | null> {
  const supabase = await createClient()
  return getLocationMatchInfoWithClient(supabase, locationId)
}

/**
 * List queued ai_query_runs for the agency (for AI Queue page).
 */
export async function getQueuedAIRuns(agencyId: string): Promise<AIQueryRun[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_query_runs')
    .select(
      `
      id, agency_id, ai_query_id, status, ran_at, raw_text, extracted, notes, created_at,
      ai_queries ( query_text, platform, frequency, location_id, locations ( name, address, city, state, zip, clients ( business_name, phone ) ) )
    `
    )
    .eq('agency_id', agencyId)
    .eq('status', 'queued')
    .order('ran_at', { ascending: true })

  if (error) return []
  const runs = (data || []) as Array<AIQueryRun & { ai_queries?: { locations?: { name: string; address: string | null; city: string | null; state: string | null; zip: string | null; clients?: { business_name: string | null; phone: string | null } } } }>
  return runs.map((r) => {
    const q = r.ai_queries
    const loc = q?.locations
    const cl = loc?.clients
    return {
      ...r,
      ai_queries: q ? { query_text: (q as { query_text: string }).query_text, platform: (q as { platform: string }).platform, frequency: (q as { frequency: string }).frequency, location_id: (q as { location_id: string }).location_id } : null,
      location: loc ? { name: loc.name, address: loc.address, city: loc.city, state: loc.state, zip: loc.zip } : null,
      client: cl ?? null,
    }
  })
}

/**
 * Get ai_query_run by id (for submit); verify agency.
 */
export async function getAIQueryRun(
  runId: string,
  agencyId: string
): Promise<{ run: AIQueryRun; locationId: string; platform: string } | null> {
  const supabase = await createClient()
  const { data: run, error } = await supabase
    .from('ai_query_runs')
    .select(
      `
      id, agency_id, ai_query_id, status, ran_at, raw_text, extracted, notes,
      ai_queries ( location_id, platform )
    `
    )
    .eq('id', runId)
    .eq('agency_id', agencyId)
    .single()

  if (error || !run) return null
  const q = (run as { ai_queries: { location_id: string; platform: string } | null }).ai_queries
  if (!q) return null
  return {
    run: run as unknown as AIQueryRun,
    locationId: q.location_id,
    platform: q.platform,
  }
}

/**
 * Get AI mentions trend for a location (for GET /api/locations/[id]/ai/mentions and portal).
 */
export async function getAIMentionsForLocation(
  locationId: string,
  days: number = 90
): Promise<AIMention[]> {
  const supabase = await createClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const { data, error } = await supabase
    .from('ai_mentions')
    .select('*')
    .eq('location_id', locationId)
    .gte('captured_at', cutoff.toISOString())
    .order('captured_at', { ascending: false })
  if (error) return []
  return (data || []) as AIMention[]
}

/**
 * Get AI mentions summary for a location (for portal).
 */
export async function getAIMentionsSummary(locationId: string, days: number = 90) {
  const mentions = await getAIMentionsForLocation(locationId, days)
  if (mentions.length === 0) {
    return {
      avgScore: 0,
      mentionCount: 0,
      platforms: [] as string[],
      trend: 'stable' as const,
      recentScore: 0,
      previousScore: 0,
    }
  }
  const avgScore =
    mentions.reduce((s, m) => s + m.visibility_score, 0) / mentions.length
  const platforms = [...new Set(mentions.map((m) => m.platform))]
  const midpoint = Math.floor(mentions.length / 2)
  const recent = mentions.slice(0, midpoint)
  const older = mentions.slice(midpoint)
  const recentScore = recent.length ? recent.reduce((s, m) => s + m.visibility_score, 0) / recent.length : 0
  const previousScore = older.length ? older.reduce((s, m) => s + m.visibility_score, 0) / older.length : 0
  let trend: 'growth' | 'stable' | 'decline' = 'stable'
  if (recentScore > previousScore * 1.1) trend = 'growth'
  else if (recentScore < previousScore * 0.9) trend = 'decline'
  return {
    avgScore: Math.round(avgScore * 10) / 10,
    mentionCount: mentions.reduce((s, m) => s + m.mention_count, 0),
    platforms,
    trend,
    recentScore: Math.round(recentScore * 10) / 10,
    previousScore: Math.round(previousScore * 10) / 10,
  }
}

/**
 * List ai_queries for agency (optionally by location).
 */
export async function getAIQueries(agencyId: string, locationId?: string): Promise<(AIQuery & { location_name?: string })[]> {
  const supabase = await createClient()
  let q = supabase
    .from('ai_queries')
    .select('*, locations(name)')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  if (locationId) q = q.eq('location_id', locationId)
  const { data, error } = await q
  if (error) return []
  return (data || []).map((row: AIQuery & { locations?: { name: string } }) => ({
    ...row,
    location_name: row.locations?.name,
  }))
}
