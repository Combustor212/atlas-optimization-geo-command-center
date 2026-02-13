import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { getClientWithLocations } from '@/lib/data/clients'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { PerformanceBadge, getBadgeVariant } from '@/components/ui/PerformanceBadge'
import { formatCurrency, formatNumber } from '@/lib/utils'
import {
  MapPin,
  Phone,
  TrendingUp,
  MousePointer,
  ArrowLeft,
} from 'lucide-react'
import { GenerateReportButton } from '@/components/portal/GenerateReportButton'
import { AddLocationForm } from '@/components/clients/AddLocationForm'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { agencyId } = (await getCurrentUserAgency()) || {}
  if (!agencyId) redirect('/login')

  const data = await getClientWithLocations(id)
  if (!data) notFound()

  const { client, locations, totals } = data

  const badges = [
    { label: 'Map Visibility', value: `+${totals.avgMapRank > 0 ? Math.round(totals.avgMapRank) : 0}%`, variant: getBadgeVariant(totals.avgMapRank) as 'growth' | 'stable' | 'decline' },
    { label: 'Organic Traffic', value: `+${totals.organicClicks} clicks`, variant: getBadgeVariant(totals.organicClicks) as 'growth' | 'stable' | 'decline' },
    { label: 'Est. Revenue Lift', value: formatCurrency(totals.estimatedRevenueLift), variant: getBadgeVariant(totals.estimatedRevenueLift) as 'growth' | 'stable' | 'decline' },
  ]

  return (
    <div className="p-8">
      <Link
        href="/dashboard/clients"
        className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Clients
      </Link>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{client.name}</h1>
          <p className="mt-1 text-[var(--muted)]">{client.email}</p>
        </div>
        <GenerateReportButton clientId={client.id} clientName={client.name} />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {badges.map((b) => (
          <PerformanceBadge key={b.label} label={b.label} value={b.value} variant={b.variant} />
        ))}
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center gap-3">
            <MapPin className="h-8 w-8 text-[var(--accent)]" />
            <div>
              <p className="text-sm text-[var(--muted)]">Locations</p>
              <p className="text-xl font-bold">{totals.locations}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-[var(--accent)]" />
            <div>
              <p className="text-sm text-[var(--muted)]">Avg Map Rank</p>
              <p className="text-xl font-bold">{totals.avgMapRank ? totals.avgMapRank.toFixed(1) : '—'}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <MousePointer className="h-8 w-8 text-[var(--accent)]" />
            <div>
              <p className="text-sm text-[var(--muted)]">Organic Clicks</p>
              <p className="text-xl font-bold">{formatNumber(totals.organicClicks)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Phone className="h-8 w-8 text-[var(--accent)]" />
            <div>
              <p className="text-sm text-[var(--muted)]">Calls Generated</p>
              <p className="text-xl font-bold">{formatNumber(totals.totalCalls)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Location Performance</CardTitle>
            <AddLocationForm clientId={client.id} />
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Location</th>
                <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Map Rank</th>
                <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Rank Δ</th>
                <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Clicks</th>
                <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Calls</th>
                <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Reviews</th>
                <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Est. Revenue</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.id} className="border-b border-[var(--card-border)] last:border-0">
                  <td className="py-4 font-medium">{loc.name}</td>
                  <td className="py-4">{loc.currentRank ?? '—'}</td>
                  <td className="py-4">
                    {loc.rankChange !== 0 ? (
                      <span className={loc.rankChange > 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
                        {loc.rankChange > 0 ? '+' : ''}{loc.rankChange.toFixed(0)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-4">{formatNumber(loc.organicClicks)}</td>
                  <td className="py-4">{formatNumber(loc.calls)}</td>
                  <td className="py-4">{formatNumber(loc.reviews)}</td>
                  <td className="py-4">{formatCurrency(loc.estimatedRevenueLift)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
