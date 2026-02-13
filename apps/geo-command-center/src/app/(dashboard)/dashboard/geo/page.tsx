import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import Link from 'next/link'

export default async function GeoPage() {
  const { agencyId } = (await getCurrentUserAgency()) || {}
  if (!agencyId) redirect('/login')

  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('agency_id', agencyId)
  const clientIds = (clients || []).map((c) => c.id)

  let locations: { id: string; name: string; client_id: string; client_name: string }[] = []
  if (clientIds.length > 0) {
    const { data: locs } = await supabase
      .from('locations')
      .select('id, name, client_id')
      .in('client_id', clientIds)
    locations = (locs || []).map((l) => ({
      ...l,
      client_name: clients?.find((c) => c.id === l.client_id)?.name ?? '',
    }))
  }

  const { data: rankings } = await supabase
    .from('rankings')
    .select('location_id, keyword, map_pack_position, organic_position, recorded_at')
    .in('location_id', locations.map((l) => l.id))
    .order('recorded_at', { ascending: false })

  const getRankForLocation = (locId: string) => {
    const r = (rankings || []).find((x) => x.location_id === locId)
    return r?.map_pack_position ?? r?.organic_position ?? null
  }

  const getHeatColor = (rank: number | null) => {
    if (rank === null) return 'bg-[var(--card-border)]'
    if (rank <= 3) return 'bg-[var(--success)]/80 text-white'
    if (rank <= 5) return 'bg-[var(--success)]/40'
    if (rank <= 7) return 'bg-[var(--warning)]/40'
    return 'bg-[var(--danger)]/40'
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">GEO Tracking Engine</h1>
        <p className="mt-1 text-[var(--muted)]">
          Map pack & organic rankings across all locations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ranking Heatmap</CardTitle>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Green = top 3 • Yellow = 4–7 • Red = 8+
          </p>
        </CardHeader>
        {locations.length === 0 ? (
          <div className="py-12 text-center text-[var(--muted)]">
            No locations yet. Add clients and locations to start tracking.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Location</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Client</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Primary Rank</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Map Pack</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => {
                  const rank = getRankForLocation(loc.id)
                  return (
                    <tr key={loc.id} className="border-b border-[var(--card-border)] last:border-0">
                      <td className="py-4">
                        <Link
                          href={`/dashboard/clients/${loc.client_id}`}
                          className="font-medium text-[var(--accent)] hover:underline"
                        >
                          {loc.name}
                        </Link>
                      </td>
                      <td className="py-4 text-[var(--muted)]">{loc.client_name}</td>
                      <td className="py-4">{rank ?? '—'}</td>
                      <td className="py-4">
                        <span
                          className={`inline-flex h-8 w-8 items-center justify-center rounded font-bold ${getHeatColor(rank)}`}
                        >
                          {rank ?? '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>API Integrations</CardTitle>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Placeholder for Local Falcon, GSC, GA4 integrations
          </p>
        </CardHeader>
        <div className="flex gap-4">
          <div className="rounded-lg border border-[var(--card-border)] px-4 py-3">
            <p className="font-medium">Local Falcon</p>
            <p className="text-sm text-[var(--muted)]">Rank tracking API</p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] px-4 py-3">
            <p className="font-medium">Google Search Console</p>
            <p className="text-sm text-[var(--muted)]">Organic clicks & impressions</p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] px-4 py-3">
            <p className="font-medium">Google Analytics 4</p>
            <p className="text-sm text-[var(--muted)]">Traffic & conversions</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
