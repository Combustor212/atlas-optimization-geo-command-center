import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAgencyMetrics, getMRRGrowthData, getRevenueCollectedData } from '@/lib/data/agency'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { MRRChart } from '@/components/dashboard/MRRChart'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import {
  DollarSign,
  Users,
  MapPin,
  TrendingUp,
  CreditCard,
  Wrench,
} from 'lucide-react'

export default async function DashboardPage() {
  const { agencyId } = (await getCurrentUserAgency()) || {}
  if (!agencyId) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { getOrCreateAgencyForUser } = await import('@/lib/data/profile')
      const newAgencyId = await getOrCreateAgencyForUser(user.id)
      if (newAgencyId) redirect('/dashboard')
    }
    return (
      <div className="p-8">
        <p className="text-[var(--muted)]">No agency found. Please contact support.</p>
      </div>
    )
  }

  const [metrics, mrrData, revenueData] = await Promise.all([
    getAgencyMetrics(agencyId),
    getMRRGrowthData(agencyId),
    getRevenueCollectedData(agencyId),
  ])

  const statCards = [
    {
      label: 'Total MRR',
      value: formatCurrency(metrics.mrr),
      icon: DollarSign,
    },
    {
      label: 'Cash Collected (This Month)',
      value: formatCurrency(metrics.cashCollected),
      icon: CreditCard,
    },
    {
      label: 'Setup Revenue (This Month)',
      value: formatCurrency(metrics.setupRevenue),
      icon: Wrench,
    },
    {
      label: 'Active Clients',
      value: String(metrics.activeClients),
      icon: Users,
    },
    {
      label: 'Locations Managed',
      value: String(metrics.locationsManaged),
      icon: MapPin,
    },
    {
      label: 'Churn Rate',
      value: `${metrics.churnRate}%`,
      icon: TrendingUp,
    },
    {
      label: 'Avg Revenue Per Client',
      value: formatCurrency(metrics.avgRevenuePerClient),
      icon: DollarSign,
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Command Center
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Agency performance overview
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.label}
              className="animate-in overflow-hidden"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--muted)]">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">
                    {stat.value}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
                  <Icon className="h-6 w-6 text-[var(--accent)]" />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="animate-in-delay-1">
          <CardHeader>
            <CardTitle>MRR Growth Over Time</CardTitle>
          </CardHeader>
          <MRRChart data={mrrData} />
        </Card>

        <Card className="animate-in-delay-2">
          <CardHeader>
            <CardTitle>Revenue Collected Over Time</CardTitle>
          </CardHeader>
          <RevenueChart data={revenueData} />
        </Card>
      </div>
    </div>
  )
}
