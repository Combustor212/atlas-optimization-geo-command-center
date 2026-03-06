/**
 * Revenue Data Access Layer
 * Functions for reading and writing revenue data from Supabase
 */

import { createClient } from '@/lib/supabase/server'
import type {
  Client,
  ClientRevenueMonthly,
  RevenueImpactSummary,
  RevenueSource,
} from '@/types/database'

/**
 * Get client revenue entries for a specific client
 */
export async function getClientRevenueEntries(
  clientId: string
): Promise<ClientRevenueMonthly[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('client_revenue_monthly')
    .select('*')
    .eq('client_id', clientId)
    .order('month', { ascending: true })

  if (error) {
    console.error('Error fetching revenue entries:', error)
    return []
  }

  return data || []
}

/**
 * Get revenue entries for a date range
 */
export async function getClientRevenueEntriesInRange(
  clientId: string,
  startMonth: string,
  endMonth: string
): Promise<ClientRevenueMonthly[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('client_revenue_monthly')
    .select('*')
    .eq('client_id', clientId)
    .gte('month', startMonth)
    .lte('month', endMonth)
    .order('month', { ascending: true })

  if (error) {
    console.error('Error fetching revenue entries:', error)
    return []
  }

  return data || []
}

/**
 * Upsert a revenue entry (create or update)
 */
export async function upsertRevenueEntry(params: {
  clientId: string
  agencyId: string
  month: string
  revenue: number
  source?: RevenueSource
  notes?: string | null
}): Promise<{ success: boolean; error?: string; data?: ClientRevenueMonthly }> {
  const supabase = await createClient()

  const entry = {
    client_id: params.clientId,
    agency_id: params.agencyId,
    month: params.month,
    revenue: params.revenue,
    source: params.source || 'MANUAL',
    notes: params.notes || null,
  }

  const { data, error } = await supabase
    .from('client_revenue_monthly')
    .upsert(entry, {
      onConflict: 'client_id,month',
    })
    .select()
    .single()

  if (error) {
    console.error('Error upserting revenue entry:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Bulk upsert multiple revenue entries
 */
export async function bulkUpsertRevenueEntries(
  entries: Array<{
    clientId: string
    agencyId: string
    month: string
    revenue: number
    source?: RevenueSource
    notes?: string | null
  }>
): Promise<{ success: boolean; error?: string; count: number }> {
  const supabase = await createClient()

  const formattedEntries = entries.map((entry) => ({
    client_id: entry.clientId,
    agency_id: entry.agencyId,
    month: entry.month,
    revenue: entry.revenue,
    source: entry.source || 'MANUAL',
    notes: entry.notes || null,
  }))

  const { data, error } = await supabase
    .from('client_revenue_monthly')
    .upsert(formattedEntries, {
      onConflict: 'client_id,month',
    })
    .select()

  if (error) {
    console.error('Error bulk upserting revenue entries:', error)
    return { success: false, error: error.message, count: 0 }
  }

  return { success: true, count: data?.length || 0 }
}

/**
 * Delete a revenue entry
 */
export async function deleteRevenueEntry(
  clientId: string,
  month: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('client_revenue_monthly')
    .delete()
    .eq('client_id', clientId)
    .eq('month', month)

  if (error) {
    console.error('Error deleting revenue entry:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Update client revenue configuration
 */
export async function updateClientRevenueConfig(
  clientId: string,
  config: {
    service_start_date?: string
    baseline_method?: string
    baseline_revenue_manual?: number | null
    gross_margin_pct?: number
    attribution_pct?: number
    exclude_partial_first_month?: boolean
    count_only_positive_lift?: boolean
    treat_missing_month_as_zero?: boolean
    currency?: string
  }
): Promise<{ success: boolean; error?: string; data?: Client }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clients')
    .update(config)
    .eq('id', clientId)
    .select()
    .single()

  if (error) {
    console.error('Error updating client config:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Call the RPC function to calculate revenue impact
 * This uses the database-side calculation for consistency
 */
export async function calculateRevenueImpactRPC(
  clientId: string
): Promise<RevenueImpactSummary | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('calculate_client_revenue_impact', {
    client_uuid: clientId,
  })

  if (error) {
    console.error('Error calculating revenue impact:', error)
    return null
  }

  if (!data || data.length === 0) {
    return null
  }

  const result = data[0]

  return {
    baseline_monthly_revenue: Number(result.baseline_monthly_revenue) || 0,
    current_month_revenue: Number(result.current_month_revenue) || 0,
    total_incremental_revenue: Number(result.total_incremental_revenue) || 0,
    attributed_incremental_revenue: Number(result.attributed_incremental_revenue) || 0,
    incremental_profit: Number(result.incremental_profit) || 0,
    revenue_growth_pct: Number(result.revenue_growth_pct) || 0,
    avg_monthly_lift: Number(result.avg_monthly_lift) || 0,
    trailing3_after_avg: Number(result.trailing3_after_avg) || 0,
    trailing3_lift: Number(result.trailing3_lift) || 0,
    months_included: Number(result.months_included) || 0,
    months: result.months || [],
  }
}

/**
 * Get client with revenue configuration
 */
export async function getClientWithRevenueConfig(clientId: string): Promise<Client | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()

  if (error) {
    console.error('Error fetching client:', error)
    return null
  }

  return data
}

/**
 * Generate month placeholders for revenue entry
 * Returns an array of month strings (YYYY-MM-01) from start to current month
 */
export function generateMonthRange(startDate: Date, endDate: Date = new Date()): string[] {
  const months: string[] = []
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1)

  while (current <= end) {
    const year = current.getFullYear()
    const month = String(current.getMonth() + 1).padStart(2, '0')
    months.push(`${year}-${month}-01`)
    current.setMonth(current.getMonth() + 1)
  }

  return months
}
