import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export type LeadFollowUpStatus =
  | 'pending'
  | 'need_to_follow_up'
  | 'contacted'
  | 'scheduled'
  | 'followed_up'
  | 'no_answer'

export interface Lead {
  id: string
  agency_id: string
  source: 'contact_form' | 'scheduled_call' | 'scan'
  name: string
  email: string
  phone: string | null
  business_name: string | null
  message: string | null
  preferred_time: string | null
  preferred_date: string | null
  scheduled_at: string | null
  timezone: string | null
  follow_up_status: LeadFollowUpStatus | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export async function getLeads(agencyId: string): Promise<Lead[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Lead[]
}

/**
 * Fetch leads for the configured funnel agency (AGS_LEADS_AGENCY_SLUG).
 * Uses admin client so any admin can see funnel leads regardless of their profile's agency_id.
 */
export async function getLeadsForFunnel(): Promise<Lead[]> {
  const slug = process.env.AGS_LEADS_AGENCY_SLUG || 'my-agency'
  const supabase = getSupabaseAdmin()
  const { data: agency } = await supabase.from('agencies').select('id').eq('slug', slug).single()
  if (!agency) return []
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: false })
  if (error) return []
  return (data || []) as Lead[]
}

/**
 * Fetch all leads visible to an admin.
 * Uses admin client to fetch all leads (admins see the full funnel).
 */
export async function getAllLeadsForAdmin(_agencyId: string): Promise<Lead[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return []
  return (data || []) as Lead[]
}
