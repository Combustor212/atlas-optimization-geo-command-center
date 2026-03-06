import { createClient } from '@/lib/supabase/server'
import type { NapProfile, Citation, CitationAudit } from '@/types/database'
import { runCitationAudit } from '@/lib/citations/audit'

export async function getNapProfileByLocationId(locationId: string): Promise<NapProfile | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('nap_profiles')
    .select('*')
    .eq('location_id', locationId)
    .maybeSingle()
  if (error) {
    console.error('Error fetching nap_profile:', error)
    return null
  }
  return data
}

export async function getCitationsByLocationId(locationId: string): Promise<Citation[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('citations')
    .select('*')
    .eq('location_id', locationId)
    .order('directory_name')
  if (error) {
    console.error('Error fetching citations:', error)
    return []
  }
  return (data || []) as Citation[]
}

export async function getLatestCitationAudit(locationId: string): Promise<CitationAudit | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('citation_audits')
    .select('*')
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('Error fetching citation_audit:', error)
    return null
  }
  return data as CitationAudit | null
}

export async function getLocationAgencyAndClient(locationId: string): Promise<{
  agency_id: string
  client_id: string
} | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('locations')
    .select('client_id, clients!inner(agency_id)')
    .eq('id', locationId)
    .single()
  if (error || !data) return null
  const clients = (data as { clients: { agency_id: string } | { agency_id: string }[] }).clients
  const agency_id = clients ? (Array.isArray(clients) ? clients[0]?.agency_id : clients.agency_id) : undefined
  if (!agency_id) return null
  return { agency_id, client_id: data.client_id }
}

/**
 * Run audit for a location and insert the result into citation_audits.
 */
export async function runAndStoreCitationAudit(locationId: string): Promise<CitationAudit | null> {
  const scope = await getLocationAgencyAndClient(locationId)
  if (!scope) return null

  const [profile, citations] = await Promise.all([
    getNapProfileByLocationId(locationId),
    getCitationsByLocationId(locationId),
  ])

  const { consistency_score, issues } = runCitationAudit(profile, citations)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('citation_audits')
    .insert({
      agency_id: scope.agency_id,
      location_id: locationId,
      consistency_score,
      issues: issues as unknown as Record<string, unknown>[],
    })
    .select()
    .single()

  if (error) {
    console.error('Error storing citation_audit:', error)
    return null
  }
  return data as CitationAudit
}
