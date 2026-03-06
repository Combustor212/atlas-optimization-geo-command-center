import dynamic from 'next/dynamic'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { getClientWithLocations, getLocationRankingHistory, getLocationTrafficHistory, getLocationCallsReviewsHistory } from '@/lib/data/clients'
import { getLatestHealthScore, getHealthScoreHistory } from '@/lib/data/health'
import { getAIVisibilitySummary, getSearchVisibilitySummary } from '@/lib/data/visibility'
import { getTasks } from '@/lib/data/tasks'
import { getAllUsers } from '@/lib/data/users'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { PerformanceBadge, getBadgeVariant } from '@/components/ui/PerformanceBadge'
import { formatCurrency, formatNumber } from '@/lib/utils'
import {
  MapPin,
  Phone,
  TrendingUp,
  MousePointer,
  ArrowLeft,
  Brain,
  Search,
  CheckSquare,
} from 'lucide-react'
import { GenerateReportButton } from '@/components/portal/GenerateReportButton'
import { AddLocationForm } from '@/components/clients/AddLocationForm'
import { EditLocationButton } from '@/components/clients/EditLocationButton'
import { DeleteClientButton } from '@/components/clients/DeleteClientButton'
import { AddRankingForm } from '@/components/rankings/AddRankingForm'
import { AutoTrackRankingButton } from '@/components/rankings/AutoTrackRankingButton'
import { GeoScoreButton } from '@/components/geo/GeoScoreButton'
import { AddTrafficMetricForm } from '@/components/traffic/AddTrafficMetricForm'
import { AddCallTrackingForm } from '@/components/calls/AddCallTrackingForm'
import { AddReviewForm } from '@/components/reviews/AddReviewForm'
import { ReviewVelocityCard } from '@/components/reviews/ReviewVelocityCard'
import { AddAIVisibilityForm } from '@/components/visibility/AddAIVisibilityForm'
import { AddSearchVisibilityForm } from '@/components/visibility/AddSearchVisibilityForm'
import { AIVisibilitySummary } from '@/components/visibility/AIVisibilitySummary'
import { SearchVisibilitySummary } from '@/components/visibility/SearchVisibilitySummary'
import { CompetitorsTab } from '@/components/competitors/CompetitorsTab'
import { CitationsTab } from '@/components/citations/CitationsTab'
import { RecommendationsPanel } from '@/components/recommendations/RecommendationsPanel'
import { RankingHistoryChart } from '@/components/charts/RankingHistoryChart'
import { HealthScoreCard } from '@/components/health/HealthScoreCard'
import { UnifiedScoresCard } from '@/components/scores/UnifiedScoresCard'
import { TaskListClient } from '@/components/tasks/TaskListClient'
import { RecommendedUpsellsSection } from '@/components/upsells/RecommendedUpsellsSection'

const AttributionSummary = dynamic(
  () => import('@/components/attribution/AttributionSummary').then((m) => m.AttributionSummary),
  { ssr: false }
)
import { TrafficChart } from '@/components/charts/TrafficChart'
import { CallsReviewsChart } from '@/components/charts/CallsReviewsChart'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { agencyId, role } = (await getCurrentUserAgency()) || {}
  if (!agencyId) redirect('/login')
  const isAdminOrStaff = role === 'admin' || role === 'staff'

  const data = await getClientWithLocations(id)
  if (!data) notFound()

  const { client, locations, totals } = data

  const badges = [
    { label: 'Map Visibility', value: `+${totals.avgMapRank > 0 ? Math.round(totals.avgMapRank) : 0}%`, variant: getBadgeVariant(totals.avgMapRank) as 'growth' | 'stable' | 'decline' },
    { label: 'Organic Traffic', value: `+${totals.organicClicks} clicks`, variant: getBadgeVariant(totals.organicClicks) as 'growth' | 'stable' | 'decline' },
    { label: 'Est. Revenue Lift', value: formatCurrency(totals.estimatedRevenueLift), variant: getBadgeVariant(totals.estimatedRevenueLift) as 'growth' | 'stable' | 'decline' },
  ]

  const firstLocationId = locations[0]?.id

  // Chart data per location (for separate performance charts per location)
  const locationChartData = await Promise.all(
    locations.map(async (loc) => ({
      locationId: loc.id,
      locationName: loc.name,
      rankingHistory: await getLocationRankingHistory(loc.id),
      trafficHistory: await getLocationTrafficHistory(loc.id),
      callsReviewsHistory: await getLocationCallsReviewsHistory(loc.id),
    }))
  )

  const [aiVisibilitySummary, searchVisibilitySummary, healthLatest, healthHistoryList, clientTasks, agencyUsers] = await Promise.all([
    firstLocationId ? getAIVisibilitySummary(firstLocationId, 30) : null,
    firstLocationId ? getSearchVisibilitySummary(firstLocationId, 30) : null,
    getLatestHealthScore(id),
    getHealthScoreHistory(id, 30),
    getTasks(agencyId, { client_id: id }),
    getAllUsers(agencyId),
  ])

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
          {client.business_name && (
            <p className="mt-1 text-sm text-[var(--muted)]">{client.business_name}</p>
          )}
          <div className="mt-1 flex flex-col gap-1 text-sm text-[var(--muted)]">
            <p>{client.email}</p>
            {client.phone && <p>{client.phone}</p>}
          </div>
        </div>
        <div className="flex gap-3">
          <DeleteClientButton clientId={client.id} clientName={client.name} />
          <GenerateReportButton clientId={client.id} clientName={client.name} />
        </div>
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

      {isAdminOrStaff && (
        <div className="mb-8">
          <RecommendedUpsellsSection agencyId={agencyId} clientId={client.id} />
        </div>
      )}

      <div className="mb-8">
        <HealthScoreCard
          clientId={client.id}
          latest={healthLatest}
          history={healthHistoryList}
          showRecalculate={true}
          readOnly={false}
        />
      </div>

      <div className="mb-8">
        <UnifiedScoresCard clientId={client.id} locationId={firstLocationId} />
      </div>

      {/* Performance Charts — separate section per location */}
      <div className="mb-8 space-y-10">
        {locationChartData.map(({ locationId, locationName, rankingHistory, trafficHistory, callsReviewsHistory }) => (
          <div key={locationId}>
            <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">{locationName} — Performance (30 Days)</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Ranking History</CardTitle>
                </CardHeader>
                <RankingHistoryChart data={rankingHistory} />
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Traffic Metrics</CardTitle>
                </CardHeader>
                <TrafficChart data={trafficHistory} />
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Calls & Reviews</CardTitle>
                </CardHeader>
                <CallsReviewsChart data={callsReviewsHistory} />
              </Card>
            </div>
          </div>
        ))}
      </div>

      {/* Review velocity forecasting */}
      <div className="mb-8 space-y-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Review velocity</h2>
        {locations.map((loc) => (
          <ReviewVelocityCard
            key={loc.id}
            locationId={loc.id}
            locationName={loc.name}
            isAdmin={true}
          />
        ))}
      </div>

      {/* AI Visibility Section */}
      {firstLocationId && (
        <div className="mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  <CardTitle>Generative AI Visibility Growth</CardTitle>
                </div>
                <AddAIVisibilityForm locationId={firstLocationId} />
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Track how your business appears in AI-powered search results
              </p>
            </CardHeader>
            {aiVisibilitySummary ? (
              <AIVisibilitySummary {...aiVisibilitySummary} />
            ) : (
              <div className="py-12 text-center text-[var(--muted)]">
                No AI visibility data yet. Click &quot;Add AI Visibility&quot; to start tracking.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Search Visibility Section */}
      {firstLocationId && (
        <div className="mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  <CardTitle>Search Visibility Growth</CardTitle>
                </div>
                <AddSearchVisibilityForm locationId={firstLocationId} />
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Comprehensive search visibility including SERP features and knowledge panels
              </p>
            </CardHeader>
            {searchVisibilitySummary ? (
              <SearchVisibilitySummary {...searchVisibilitySummary} />
            ) : (
              <div className="py-12 text-center text-[var(--muted)]">
                No search visibility data yet. Click &quot;Add Search Visibility&quot; to start tracking.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Citation & NAP Consistency */}
      {firstLocationId && (
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Citation & NAP Consistency</CardTitle>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Track directory listings and NAP consistency per location
              </p>
            </CardHeader>
            <div className="px-6 pb-6">
              <CitationsTab
                locationId={firstLocationId}
                locationName={locations[0]?.name ?? ''}
                isAdmin={isAdminOrStaff}
              />
            </div>
          </Card>
          {locations.length > 1 && (
            <div className="mt-6 space-y-6">
              {locations.slice(1).map((loc) => (
                <Card key={loc.id}>
                  <CardHeader>
                    <CardTitle>{loc.name} — Citations</CardTitle>
                  </CardHeader>
                  <div className="px-6 pb-6">
                    <CitationsTab
                      locationId={loc.id}
                      locationName={loc.name}
                      isAdmin={isAdminOrStaff}
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lead Attribution Section */}
      {firstLocationId && (
        <div className="mb-8">
          <AttributionSummary
            locationId={firstLocationId}
            locationName={locations[0]?.name}
            range="30d"
            isAdmin={true}
          />
        </div>
      )}

      {/* Competitor Intelligence Section */}
      {firstLocationId && (
        <div className="mb-8">
          <CompetitorsTab locationId={firstLocationId} isAdmin={true} />
        </div>
      )}

      {/* Recommendations Panel (per location) */}
      {firstLocationId && (
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Location Recommendations</CardTitle>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Action Engine generates recommendations per location. Generate to create or refresh open recommendations.
              </p>
            </CardHeader>
            <RecommendationsPanel
              locationId={firstLocationId}
              locationName={locations[0]?.name}
              isAdmin={true}
            />
          </Card>
          {locations.length > 1 && (
            <div className="mt-6 space-y-6">
              {locations.slice(1).map((loc) => (
                <Card key={loc.id}>
                  <CardHeader>
                    <CardTitle>{loc.name} — Recommendations</CardTitle>
                  </CardHeader>
                  <RecommendationsPanel
                    locationId={loc.id}
                    locationName={loc.name}
                    isAdmin={true}
                  />
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tasks scoped to this client */}
      <div className="mb-8">
        <TaskListClient
          initialTasks={clientTasks}
          clients={[{ id: client.id, name: client.name }]}
          locations={locations.map((loc) => ({ id: loc.id, name: loc.name, client_id: client.id }))}
          users={agencyUsers.map((u) => ({ id: u.id, full_name: u.full_name ?? null }))}
          scopeClientId={client.id}
          title={`Tasks for ${client.name}`}
        />
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
                <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Actions</th>
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
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/tasks?client_id=${client.id}&location_id=${loc.id}`}
                        className="inline-flex items-center gap-1 rounded border border-[var(--card-border)] px-2 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--accent-muted)] hover:text-[var(--foreground)]"
                        title="View tasks for this location"
                      >
                        <CheckSquare className="h-4 w-4" />
                        Tasks
                      </Link>
                      <EditLocationButton location={loc} />
                      <GeoScoreButton 
                        locationId={loc.id}
                        locationName={loc.name}
                      />
                      <AutoTrackRankingButton 
                        locationId={loc.id}
                        locationName={loc.name}
                      />
                      <AddRankingForm locationId={loc.id} />
                      <AddTrafficMetricForm locationId={loc.id} />
                      <AddCallTrackingForm locationId={loc.id} />
                      <AddReviewForm locationId={loc.id} />
                      <AddAIVisibilityForm locationId={loc.id} />
                      <AddSearchVisibilityForm locationId={loc.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
