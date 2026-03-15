import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { getVisibilityGrowthMetrics } from '@/lib/data/visibility'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import Link from 'next/link'
import { AddRankingForm } from '@/components/rankings/AddRankingForm'
import { AutoTrackRankingButton } from '@/components/rankings/AutoTrackRankingButton'
import { GeoScoreButton } from '@/components/geo/GeoScoreButton'
import { TrendingUp, TrendingDown, Minus, Brain, Search, Sparkles } from 'lucide-react'

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

  // Get latest and previous rankings for each location
  const { data: allRankings } = await supabase
    .from('rankings')
    .select('location_id, keyword, keyword_type, map_pack_position, organic_position, recorded_at')
    .in('location_id', locations.map((l) => l.id))
    .order('recorded_at', { ascending: false })

  // Get visibility growth metrics
  const visibilityMetrics = await getVisibilityGrowthMetrics(agencyId, 30)

  const getLatestRankForLocation = (locId: string) => {
    const ranks = (allRankings || []).filter((x) => x.location_id === locId && x.keyword_type === 'primary')
    const latest = ranks[0]
    const previous = ranks[1]
    const currentRank = latest?.map_pack_position ?? latest?.organic_position ?? null
    const previousRank = previous?.map_pack_position ?? previous?.organic_position ?? null
    const change = currentRank !== null && previousRank !== null ? previousRank - currentRank : null
    return { currentRank, previousRank, change, keyword: latest?.keyword ?? '—' }
  }

  const getVisibilityMetrics = (locId: string) => {
    return visibilityMetrics.find(m => m.location_id === locId) || {
      ai_visibility_score: 0,
      ai_mention_count: 0,
      ai_trend: 'stable' as const,
      search_visibility_score: 0,
      serp_feature_coverage: 0,
      search_trend: 'stable' as const,
      combined_visibility_score: 0,
    }
  }

  const getHeatColor = (rank: number | null) => {
    if (rank === null) return 'bg-[var(--card-border)]'
    if (rank <= 3) return 'bg-[var(--success)]/80 text-white'
    if (rank <= 5) return 'bg-[var(--success)]/40'
    if (rank <= 7) return 'bg-[var(--warning)]/40'
    return 'bg-[var(--danger)]/40'
  }

  const getRankTrendIcon = (change: number | null) => {
    if (change === null) return <Minus className="h-4 w-4 text-[var(--muted)]" />
    if (change > 0) return <TrendingUp className="h-4 w-4 text-[var(--success)]" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-[var(--danger)]" />
    return <Minus className="h-4 w-4 text-[var(--muted)]" />
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
            🟢 Top 3 • 🟡 4–7 • 🔴 8+ • Track ranking trends and keyword performance
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
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Primary Keyword</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Current Rank</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Map Pack</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Trend</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => {
                  const { currentRank, change, keyword } = getLatestRankForLocation(loc.id)
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
                      <td className="py-4 text-sm">{keyword}</td>
                      <td className="py-4 font-medium">{currentRank ?? '—'}</td>
                      <td className="py-4">
                        <span
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-lg font-bold ${getHeatColor(currentRank)}`}
                        >
                          {currentRank ?? '—'}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          {getRankTrendIcon(change)}
                          {change !== null && change !== 0 && (
                            <span className={change > 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
                              {change > 0 ? '+' : ''}{change}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex gap-2">
                          <GeoScoreButton 
                            locationId={loc.id}
                            locationName={loc.name}
                          />
                          <AutoTrackRankingButton 
                            locationId={loc.id} 
                            locationName={loc.name}
                          />
                          <AddRankingForm locationId={loc.id} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Generative AI Visibility Growth Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Generative AI Visibility Growth
          </CardTitle>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Track how your locations appear in AI-powered search (ChatGPT, Gemini, Perplexity, etc.)
          </p>
        </CardHeader>
        {locations.length === 0 ? (
          <div className="py-12 text-center text-[var(--muted)]">
            No locations yet. Add clients and locations to start tracking AI visibility.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Location</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Client</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">AI Score</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Mentions</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Trend</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => {
                  const visibility = getVisibilityMetrics(loc.id)
                  return (
                    <tr key={`ai-${loc.id}`} className="border-b border-[var(--card-border)] last:border-0">
                      <td className="py-4">
                        <Link
                          href={`/dashboard/clients/${loc.client_id}`}
                          className="font-medium text-[var(--accent)] hover:underline"
                        >
                          {loc.name}
                        </Link>
                      </td>
                      <td className="py-4 text-[var(--muted)]">{loc.client_name}</td>
                      <td className="py-4">
                        <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium ${
                          visibility.ai_visibility_score >= 70 ? 'bg-[var(--success)]/20 text-[var(--success)]' :
                          visibility.ai_visibility_score >= 40 ? 'bg-[var(--warning)]/20 text-[var(--warning)]' :
                          visibility.ai_visibility_score > 0 ? 'bg-[var(--danger)]/20 text-[var(--danger)]' :
                          'bg-[var(--card-border)] text-[var(--muted)]'
                        }`}>
                          {visibility.ai_visibility_score > 0 ? `${visibility.ai_visibility_score.toFixed(0)}/100` : '—'}
                        </span>
                      </td>
                      <td className="py-4 font-medium">{visibility.ai_mention_count}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          {visibility.ai_trend === 'growth' && <TrendingUp className="h-4 w-4 text-[var(--success)]" />}
                          {visibility.ai_trend === 'decline' && <TrendingDown className="h-4 w-4 text-[var(--danger)]" />}
                          {visibility.ai_trend === 'stable' && <Minus className="h-4 w-4 text-[var(--muted)]" />}
                          <span className="text-sm capitalize text-[var(--muted)]">{visibility.ai_trend}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <button className="text-sm text-[var(--accent)] hover:underline">
                          View Details
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Search Visibility Growth Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Visibility Growth
          </CardTitle>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Track comprehensive search visibility including SERP features, featured snippets, and knowledge panels
          </p>
        </CardHeader>
        {locations.length === 0 ? (
          <div className="py-12 text-center text-[var(--muted)]">
            No locations yet. Add clients and locations to start tracking search visibility.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Location</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Client</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Visibility Score</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">SERP Features</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Combined Score</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Trend</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => {
                  const visibility = getVisibilityMetrics(loc.id)
                  return (
                    <tr key={`search-${loc.id}`} className="border-b border-[var(--card-border)] last:border-0">
                      <td className="py-4">
                        <Link
                          href={`/dashboard/clients/${loc.client_id}`}
                          className="font-medium text-[var(--accent)] hover:underline"
                        >
                          {loc.name}
                        </Link>
                      </td>
                      <td className="py-4 text-[var(--muted)]">{loc.client_name}</td>
                      <td className="py-4">
                        <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium ${
                          visibility.search_visibility_score >= 70 ? 'bg-[var(--success)]/20 text-[var(--success)]' :
                          visibility.search_visibility_score >= 40 ? 'bg-[var(--warning)]/20 text-[var(--warning)]' :
                          visibility.search_visibility_score > 0 ? 'bg-[var(--danger)]/20 text-[var(--danger)]' :
                          'bg-[var(--card-border)] text-[var(--muted)]'
                        }`}>
                          {visibility.search_visibility_score > 0 ? `${visibility.search_visibility_score.toFixed(0)}/100` : '—'}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-[var(--card-border)]">
                            <div
                              className="h-full rounded-full bg-[var(--accent)]"
                              style={{ width: `${Math.min(visibility.serp_feature_coverage, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-[var(--muted)]">{visibility.serp_feature_coverage.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                          {visibility.combined_visibility_score > 0 ? `${visibility.combined_visibility_score.toFixed(0)}/100` : '—'}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          {visibility.search_trend === 'growth' && <TrendingUp className="h-4 w-4 text-[var(--success)]" />}
                          {visibility.search_trend === 'decline' && <TrendingDown className="h-4 w-4 text-[var(--danger)]" />}
                          {visibility.search_trend === 'stable' && <Minus className="h-4 w-4 text-[var(--muted)]" />}
                          <span className="text-sm capitalize text-[var(--muted)]">{visibility.search_trend}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <button className="text-sm text-[var(--accent)] hover:underline">
                          View Details
                        </button>
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
            Connect external data sources for automated rank tracking and analytics
          </p>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 hover:border-[var(--accent)] transition-colors">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold text-[var(--foreground)]">Google Places API</p>
              <span className="rounded-full bg-[var(--success)]/20 px-2 py-1 text-xs font-medium text-[var(--success)]">
                Active
              </span>
            </div>
            <p className="text-sm text-[var(--muted)]">Real-time local pack ranking & business data</p>
            <p className="mt-2 text-xs text-[var(--muted)]">API Key: Configured ✓</p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 hover:border-[var(--accent)] transition-colors">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold text-[var(--foreground)]">Local Falcon</p>
              <span className="rounded-full bg-[var(--warning)]/20 px-2 py-1 text-xs font-medium text-[var(--warning)]">
                Optional
              </span>
            </div>
            <p className="text-sm text-[var(--muted)]">Grid-based rank tracking for local search</p>
            <p className="mt-2 text-xs text-[var(--muted)]">API Key: Not configured</p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 hover:border-[var(--accent)] transition-colors">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold text-[var(--foreground)]">Google Search Console</p>
              <span className="rounded-full bg-[var(--warning)]/20 px-2 py-1 text-xs font-medium text-[var(--warning)]">
                Optional
              </span>
            </div>
            <p className="text-sm text-[var(--muted)]">Organic clicks, impressions & CTR</p>
            <p className="mt-2 text-xs text-[var(--muted)]">OAuth: Not configured</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
