import { createClient } from '@/lib/supabase/server'

export async function getAgencyMetrics(agencyId: string) {
  const supabase = await createClient()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [subsRes, paymentsRes, clientsRes] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('mrr, status')
      .eq('agency_id', agencyId)
      .eq('status', 'active'),
    supabase
      .from('payments')
      .select('amount, type, paid_at')
      .eq('agency_id', agencyId)
      .gte('paid_at', startOfMonth),
    supabase
      .from('clients')
      .select('id')
      .eq('agency_id', agencyId),
  ])

  const clients = clientsRes.data || []
  const mrr = (subsRes.data || []).reduce((sum, s) => sum + (s.mrr || 0), 0)
  const payments = paymentsRes.data || []
  const cashCollected = payments.reduce((sum, p) => sum + p.amount, 0)
  const setupRevenue = payments
    .filter((p) => p.type === 'setup')
    .reduce((sum, p) => sum + p.amount, 0)
  const activeClients = clients.length

  const clientIds = clients.map((c) => c.id)
  let locationsManaged = 0
  if (clientIds.length > 0) {
    const { count } = await supabase
      .from('locations')
      .select('id', { count: 'exact', head: true })
      .in('client_id', clientIds)
    locationsManaged = count ?? 0
  }
  const avgRevenuePerClient = activeClients > 0 ? mrr / activeClients : 0

  return {
    mrr,
    cashCollected,
    setupRevenue,
    activeClients,
    locationsManaged: locationsManaged || 0,
    churnRate: 0,
    avgRevenuePerClient,
  }
}

export async function getMRRGrowthData(agencyId: string, months = 6) {
  const supabase = await createClient()
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('mrr')
    .eq('agency_id', agencyId)
    .eq('status', 'active')
  const totalMrr = (subs || []).reduce((s, x) => s + (x.mrr || 0), 0)

  const data: { month: string; mrr: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    data.push({
      month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      mrr: totalMrr,
    })
  }
  return data
}

export async function getRevenueCollectedData(agencyId: string, months = 6) {
  const supabase = await createClient()
  const data: { month: string; revenue: number }[] = []

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()

    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('agency_id', agencyId)
      .gte('paid_at', start)
      .lte('paid_at', end)

    const revenue = (payments || []).reduce((s, p) => s + p.amount, 0)
    data.push({
      month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      revenue,
    })
  }

  return data
}
