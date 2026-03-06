import { createClient } from '@/lib/supabase/server'
import type { HealthScore } from '@/types/database'

export async function getLatestHealthScore(clientId: string): Promise<HealthScore | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('health_scores')
    .select('id, agency_id, client_id, location_id, score, band, factors, calculated_at')
    .eq('client_id', clientId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as HealthScore | null
}

export async function getHealthScoreHistory(
  clientId: string,
  limit = 30
): Promise<HealthScore[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('health_scores')
    .select('id, agency_id, client_id, location_id, score, band, factors, calculated_at')
    .eq('client_id', clientId)
    .order('calculated_at', { ascending: false })
    .limit(limit)
  return (data || []) as HealthScore[]
}

/** Fetch latest health score per client for an agency (for list view). */
export async function getLatestHealthScoresByAgency(
  agencyId: string
): Promise<Record<string, HealthScore>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('health_scores')
    .select('id, agency_id, client_id, location_id, score, band, factors, calculated_at')
    .eq('agency_id', agencyId)
    .order('calculated_at', { ascending: false })
  if (!data || data.length === 0) return {}
  const byClient: Record<string, HealthScore> = {}
  for (const row of data as HealthScore[]) {
    if (!byClient[row.client_id]) byClient[row.client_id] = row
  }
  return byClient
}
