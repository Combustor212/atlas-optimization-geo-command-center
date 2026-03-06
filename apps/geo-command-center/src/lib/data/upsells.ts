import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UpsellTrigger, UpsellOpportunity, UpsellCondition } from '@/lib/upsells/types'

export async function getUpsellTriggers(agencyId: string): Promise<UpsellTrigger[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('upsell_triggers')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .order('name')
  return (data || []).map(normalizeTrigger)
}

export async function getUpsellOpportunities(
  agencyId: string,
  options?: { status?: string; clientId?: string }
): Promise<(UpsellOpportunity & { trigger?: UpsellTrigger; client_name?: string; location_name?: string })[]> {
  const supabase = await createClient()
  let q = supabase
    .from('upsell_opportunities')
    .select(`
      *,
      trigger:upsell_triggers(*),
      client:clients(name),
      location:locations(name)
    `)
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
  if (options?.status) {
    q = q.eq('status', options.status)
  }
  if (options?.clientId) {
    q = q.eq('client_id', options.clientId)
  }
  const { data } = await q
  return (data || []).map((row: Record<string, unknown>) => ({
    ...row,
    trigger: Array.isArray(row.trigger) ? row.trigger[0] : row.trigger,
    client_name: (row.client as { name?: string } | null)?.name ?? null,
    location_name: (row.location as { name?: string } | null)?.name ?? null,
  })) as (UpsellOpportunity & { trigger?: UpsellTrigger; client_name?: string; location_name?: string })[]
}

export async function getOpenOpportunitiesForClient(
  supabase: SupabaseClient,
  clientId: string,
  locationId: string | null,
  triggerId: string
): Promise<boolean> {
  let q = supabase
    .from('upsell_opportunities')
    .select('id')
    .eq('client_id', clientId)
    .eq('trigger_id', triggerId)
    .eq('status', 'open')
  if (locationId) {
    q = q.eq('location_id', locationId)
  } else {
    q = q.is('location_id', null)
  }
  const { data } = await q.limit(1)
  return (data?.length ?? 0) > 0
}

export async function createUpsellOpportunity(
  supabase: SupabaseClient,
  agencyId: string,
  clientId: string,
  locationId: string | null,
  triggerId: string
): Promise<void> {
  await supabase.from('upsell_opportunities').insert({
    agency_id: agencyId,
    client_id: clientId,
    location_id: locationId,
    trigger_id: triggerId,
    status: 'open',
  })
}

function normalizeTrigger(row: Record<string, unknown>): UpsellTrigger {
  return {
    id: row.id as string,
    agency_id: row.agency_id as string,
    name: row.name as string,
    condition: row.condition as UpsellCondition,
    offer_type: row.offer_type as UpsellTrigger['offer_type'],
    message_template: row.message_template as string,
    is_active: (row.is_active as boolean) ?? true,
    created_at: row.created_at as string,
  }
}
