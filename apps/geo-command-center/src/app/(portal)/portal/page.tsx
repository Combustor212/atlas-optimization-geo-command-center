import dynamic from 'next/dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientWithLocations, getLocationRankingHistory, getLocationTrafficHistory, getLocationCallsReviewsHistory } from '@/lib/data/clients'
import { getLatestHealthScore, getHealthScoreHistory } from '@/lib/data/health'
import { getClientVisibleTasks } from '@/lib/data/tasks'
import { getAIVisibilitySummary, getSearchVisibilitySummary } from '@/lib/data/visibility'
import { getAIMentionsSummary } from '@/lib/data/ai-mentions'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { PerformanceBadge, getBadgeVariant } from '@/components/ui/PerformanceBadge'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { PortalChart } from '@/components/portal/PortalChart'
import { RankingHistoryChart } from '@/components/charts/RankingHistoryChart'
import { TrafficChart } from '@/components/charts/TrafficChart'
import { CallsReviewsChart } from '@/components/charts/CallsReviewsChart'
import { AIVisibilitySummary } from '@/components/visibility/AIVisibilitySummary'
import { SearchVisibilitySummary } from '@/components/visibility/SearchVisibilitySummary'
import { CompetitorsTab } from '@/components/competitors/CompetitorsTab'
import { RecommendationsPanel } from '@/components/recommendations/RecommendationsPanel'
import { MapPin, Phone, Star, TrendingUp, Brain, Search } from 'lucide-react'

const AttributionSummary = dynamic(
  () => import('@/components/attribution/AttributionSummary').then((m) => m.AttributionSummary),
  { ssr: false }
)
import { GenerateReportButton } from '@/components/portal/GenerateReportButton'
import Link from 'next/link'
import { HealthScoreCard } from '@/components/health/HealthScoreCard'
import { UnifiedScoresCard } from '@/components/scores/UnifiedScoresCard'
import { PortalTasksCard } from '@/components/tasks/PortalTasksCard'

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

  const [latestHealth, healthHistory, visibleTasks] = await Promise.all([
    getLatestHealthScore(profile.client_id),
    getHealthScoreHistory(profile.client_id, 30),
    getClientVisibleTasks(profile.client_id),
  ])

  // Get visibility data for first location (AI mentions = manual capture; fallback = legacy generative_ai_visibility)
  const firstLocationId = locations[0]?.id
  const [aiMentionsSummary, aiVisibilitySummaryLegacy, searchVisibilitySummary] = firstLocationId
    ? await Promise.all([
        getAIMentionsSummary(firstLocationId, 90),
        getAIVisibilitySummary(firstLocationId, 30),
        getSearchVisibilitySummary(firstLocationId, 30),
      ])
    : [null, null, null]
  const aiVisibilitySummary =
    aiMentionsSummary && (aiMentionsSummary.mentionCount > 0 || aiMentionsSummary.avgScore > 0)
      ? aiMentionsSummary
      : aiVisibilitySummaryLegacy

  const chartData = locations.slice(0, 6).map((loc) => ({
    name: loc.name,
    rank: loc.currentRank ?? 0,
    revenue: loc.estimatedRevenueLift,
  }))

  // Chart data per location (separate Ranking / Traffic / Calls & Reviews per location)
  const locationChartData = await Promise.all(
    locations.map(async (loc) => ({
      locationId: loc.id,
      locationName: loc.name,
      rankingHistory: await getLocationRankingHistory(loc.id),
      trafficHistory: await getLocationTrafficHistory(loc.id),
      callsReviewsHistory: await getLocationCallsReviewsHistory(loc.id),
    }))
  )

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
        <div className="flex gap-2">
          <GenerateReportButton clientId={client.id} clientName={client.name} />
          <Link
            href="/portal/reports"
            className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] px-4 py-2.5 font-medium text-[var(--foreground)] hover:bg-[var(--accent-muted)]"
          >
            Report History
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {badges.map((b) => (
          <PerformanceBadge key={b.label} label={b.label} value={b.value} variant={b.variant} />
        ))}
      </div>

      <div className="mb-8">
        <HealthScoreCard
          clientId={client.id}
          latest={latestHealth}
          history={healthHistory}
          showRecalculate={false}
          readOnly={true}
        />
      </div>

      <div className="mb-8">
        <UnifiedScoresCard clientId={client.id} locationId={firstLocationId} />
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

      {/* AI Visibility Section */}
      {firstLocationId && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                <CardTitle>Your AI Visibility Growth</CardTitle>
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                How your business appears in AI-powered search (ChatGPT, Gemini, Perplexity)
              </p>
            </CardHeader>
            {aiVisibilitySummary && (aiVisibilitySummary.mentionCount > 0 || aiVisibilitySummary.avgScore > 0) ? (
              <AIVisibilitySummary {...aiVisibilitySummary} />
            ) : (
              <div className="py-8 text-center text-[var(--muted)]">
                Your agency is tracking AI visibility for your business. Check back soon for updates!
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Search Visibility Section */}
      {firstLocationId && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                <CardTitle>Your Search Visibility Growth</CardTitle>
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Your presence in search features: featured snippets, knowledge panels, and more
              </p>
            </CardHeader>
            {searchVisibilitySummary && searchVisibilitySummary.avgScore > 0 ? (
              <SearchVisibilitySummary {...searchVisibilitySummary} />
            ) : (
              <div className="py-8 text-center text-[var(--muted)]">
                Your agency is tracking search visibility for your business. Check back soon for updates!
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Lead Attribution Section */}
      {firstLocationId && (
        <div className="mb-6">
          <AttributionSummary
            locationId={firstLocationId}
            locationName={locations[0]?.name}
            range="30d"
            isAdmin={false}
          />
        </div>
      )}

      {/* Competitor Intelligence Section */}
      {firstLocationId && (
        <div className="mb-6">
          <CompetitorsTab locationId={firstLocationId} isAdmin={false} />
        </div>
      )}

      {/* Recommendations (read-only for clients) */}
      {firstLocationId && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Recommendations</CardTitle>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Actionable insights from your agency
              </p>
            </CardHeader>
            <RecommendationsPanel
              locationId={firstLocationId}
              locationName={locations[0]?.name}
              isAdmin={false}
            />
          </Card>
        </div>
      )}

      {/* Tasks shared by agency (read-only) */}
      <div className="mb-6">
        <PortalTasksCard tasks={visibleTasks} />
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

      {/* Separate charts per location — Ranking History, Traffic, Calls & Reviews */}
      <div className="mt-10 space-y-10">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Performance by location (30 days)</h2>
        {locationChartData.map(({ locationId, locationName, rankingHistory, trafficHistory, callsReviewsHistory }) => (
          <div key={locationId}>
            <h3 className="mb-4 text-base font-semibold text-[var(--foreground)]">{locationName}</h3>
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
    </div>
  )
}
