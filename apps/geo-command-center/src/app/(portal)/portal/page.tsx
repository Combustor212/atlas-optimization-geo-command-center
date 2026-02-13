import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientWithLocations } from '@/lib/data/clients'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { PerformanceBadge, getBadgeVariant } from '@/components/ui/PerformanceBadge'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { PortalChart } from '@/components/portal/PortalChart'
import { MapPin, Phone, Star, TrendingUp } from 'lucide-react'
import { GenerateReportButton } from '@/components/portal/GenerateReportButton'

export default async function PortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('client_id')
    .eq('id', user.id)
    .single()

  if (!profile?.client_id) redirect('/dashboard')

  const data = await getClientWithLocations(profile.client_id)
  if (!data) redirect('/dashboard')

  const { client, locations, totals } = data

  const chartData = locations.slice(0, 6).map((loc) => ({
    name: loc.name,
    rank: loc.currentRank ?? 0,
    revenue: loc.estimatedRevenueLift,
  }))

  const badges = [
    { label: 'Map Visibility', value: `+${totals.avgMapRank > 0 ? Math.round(totals.avgMapRank) : 0}%`, variant: getBadgeVariant(totals.avgMapRank) as 'growth' | 'stable' | 'decline' },
    { label: 'Organic Traffic', value: `+${totals.organicClicks} clicks`, variant: getBadgeVariant(totals.organicClicks) as 'growth' | 'stable' | 'decline' },
    { label: 'Est. Revenue Lift', value: formatCurrency(totals.estimatedRevenueLift), variant: getBadgeVariant(totals.estimatedRevenueLift) as 'growth' | 'stable' | 'decline' },
  ]

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{client.name}</h1>
          <p className="mt-1 text-[var(--muted)]">Your performance overview</p>
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
            <Phone className="h-8 w-8 text-[var(--accent)]" />
            <div>
              <p className="text-sm text-[var(--muted)]">Calls Generated</p>
              <p className="text-xl font-bold">{formatNumber(totals.totalCalls)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Star className="h-8 w-8 text-[var(--accent)]" />
            <div>
              <p className="text-sm text-[var(--muted)]">Reviews Gained</p>
              <p className="text-xl font-bold">{formatNumber(totals.reviewsGained)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Location Performance</CardTitle>
          </CardHeader>
          <PortalChart data={chartData} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="flex items-center justify-between rounded-lg border border-[var(--card-border)] p-3"
              >
                <div>
                  <p className="font-medium">{loc.name}</p>
                  <p className="text-sm text-[var(--muted)]">
                    Rank #{loc.currentRank ?? '—'} • {formatCurrency(loc.estimatedRevenueLift)} est. lift
                  </p>
                </div>
              </div>
            ))}
            {locations.length === 0 && (
              <p className="py-4 text-center text-[var(--muted)]">No locations</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
