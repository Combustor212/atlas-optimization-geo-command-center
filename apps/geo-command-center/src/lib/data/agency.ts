import { createClient } from '@/lib/supabase/server'

export async function getAgencyMetrics(agencyId: string) {
  const supabase = await createClient()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

  const [subsRes, paymentsRes, clientsRes, lastMonthSubsRes] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('mrr, status, client_id')
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
    supabase
      .from('subscriptions')
      .select('client_id, status')
      .eq('agency_id', agencyId)
      .gte('created_at', startOfLastMonth)
      .lte('created_at', endOfLastMonth),
  ])

  const clients = clientsRes.data || []
  const activeSubs = subsRes.data || []
  const mrr = activeSubs.reduce((sum, s) => sum + Number(s.mrr || 0), 0)
  const payments = paymentsRes.data || []
  const cashCollected = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const setupRevenue = payments
    .filter((p) => p.type === 'setup')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)
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

  // Calculate churn rate
  const lastMonthActiveClients = new Set(
    (lastMonthSubsRes.data || [])
      .filter((s) => s.status === 'active')
      .map((s) => s.client_id)
  ).size
  const currentActiveClients = new Set(activeSubs.map((s) => s.client_id)).size
  const churnedClients = Math.max(0, lastMonthActiveClients - currentActiveClients)
  const churnRate = lastMonthActiveClients > 0 
    ? (churnedClients / lastMonthActiveClients) * 100 
    : 0

  const avgRevenuePerClient = activeClients > 0 ? mrr / activeClients : 0

  return {
    mrr: Number(mrr),
    cashCollected: Number(cashCollected),
    setupRevenue: Number(setupRevenue),
    activeClients,
    locationsManaged: locationsManaged || 0,
    churnRate: Number(churnRate.toFixed(2)),
    avgRevenuePerClient: Number(avgRevenuePerClient),
  }
}

export async function getMRRGrowthData(
  agencyId: string, 
  startDate?: string, 
  endDate?: string
) {
  const supabase = await createClient()
  
  // Default to current month if no dates provided
  const now = new Date()
  const start = startDate 
    ? new Date(startDate) 
    : new Date(now.getFullYear(), now.getMonth(), 1)
  const end = endDate 
    ? new Date(endDate) 
    : new Date(now.getFullYear(), now.getMonth() + 1, 0)
  
  const data: { date: string; mrr: number }[] = []
  
  // Generate daily data points
  const currentDate = new Date(start)
  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const endOfDay = new Date(currentDate)
    endOfDay.setHours(23, 59, 59, 999)
    
    // Get subscriptions that were active on this specific day
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('mrr, current_period_start, current_period_end')
      .eq('agency_id', agencyId)
      .or(`status.eq.active,status.eq.canceled`)
      .lte('current_period_start', endOfDay.toISOString())
      .or(`current_period_end.is.null,current_period_end.gte.${currentDate.toISOString()}`)
    
    const dayMrr = (subs || []).reduce((sum, s) => sum + Number(s.mrr || 0), 0)

    data.push({
      date: dateStr,
      mrr: Number(dayMrr),
    })
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return data
}

export async function getRevenueCollectedData(
  agencyId: string, 
  startDate?: string, 
  endDate?: string
) {
  const supabase = await createClient()
  
  // Default to current month if no dates provided
  const now = new Date()
  const start = startDate 
    ? new Date(startDate) 
    : new Date(now.getFullYear(), now.getMonth(), 1)
  const end = endDate 
    ? new Date(endDate) 
    : new Date(now.getFullYear(), now.getMonth() + 1, 0)
  
  const data: { date: string; revenue: number }[] = []

  // Generate daily data points
  const currentDate = new Date(start)
  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const dayStart = new Date(currentDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(currentDate)
    dayEnd.setHours(23, 59, 59, 999)

    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('agency_id', agencyId)
      .gte('paid_at', dayStart.toISOString())
      .lte('paid_at', dayEnd.toISOString())

    const revenue = (payments || []).reduce((s, p) => s + Number(p.amount || 0), 0)
    data.push({
      date: dateStr,
      revenue: Number(revenue),
    })
    
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return data
}

export async function getSubscriptionsByStatus(agencyId: string) {
  const supabase = await createClient()
  
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('status, mrr, client_id, stripe_subscription_id, created_at, current_period_end')
    .eq('agency_id', agencyId)
  
  return subs || []
}

export async function getLastPaymentsByClient(agencyId: string) {
  const supabase = await createClient()
  
  // Get the most recent payment for each client
  const { data: payments } = await supabase
    .from('payments')
    .select('client_id, paid_at')
    .eq('agency_id', agencyId)
    .not('client_id', 'is', null)
    .order('paid_at', { ascending: false })
  
  if (!payments) return new Map()
  
  // Create a map of client_id to most recent payment date
  const lastPaymentMap = new Map<string, string>()
  payments.forEach(payment => {
    if (payment.client_id && !lastPaymentMap.has(payment.client_id)) {
      lastPaymentMap.set(payment.client_id, payment.paid_at)
    }
  })
  
  return lastPaymentMap
}
