'use client'

import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { PerformanceBadge, getBadgeVariant } from '@/components/ui/PerformanceBadge'
import { Search, Eye, Target, TrendingUp } from 'lucide-react'

interface SearchVisibilitySummaryProps {
  avgScore: number
  avgPosition: number | null
  serpFeatureCoverage: number
  localPackAppearances: number
  featuredSnippets: number
  knowledgePanels: number
  trend: 'growth' | 'stable' | 'decline'
  recentScore: number
  previousScore: number
}

export function SearchVisibilitySummary({
  avgScore,
  avgPosition,
  serpFeatureCoverage,
  localPackAppearances,
  featuredSnippets,
  knowledgePanels,
  trend,
  recentScore,
  previousScore,
}: SearchVisibilitySummaryProps) {
  const scoreChange = recentScore - previousScore
  const scoreChangePct = previousScore > 0 ? ((scoreChange / previousScore) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <div className="flex items-center gap-3">
            <Search className="h-8 w-8 text-[var(--accent)]" />
            <div>
              <p className="text-sm text-[var(--muted)]">Visibility Score</p>
              <p className="text-xl font-bold">{avgScore.toFixed(1)}/100</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <Target className="h-8 w-8 text-[var(--accent)]" />
            <div>
              <p className="text-sm text-[var(--muted)]">Avg Position</p>
              <p className="text-xl font-bold">{avgPosition ? avgPosition.toFixed(1) : '—'}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <Eye className="h-8 w-8 text-[var(--accent)]" />
            <div>
              <p className="text-sm text-[var(--muted)]">SERP Features</p>
              <p className="text-xl font-bold">{serpFeatureCoverage.toFixed(0)}%</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-[var(--accent)]" />
            <div>
              <p className="text-sm text-[var(--muted)]">Score Change</p>
              <p className={`text-xl font-bold ${scoreChange > 0 ? 'text-[var(--success)]' : scoreChange < 0 ? 'text-[var(--danger)]' : ''}`}>
                {scoreChange > 0 ? '+' : ''}{scoreChange.toFixed(1)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Performance Badge */}
      <div className="flex gap-3">
        <PerformanceBadge
          label="Search Visibility Trend"
          value={`${trend === 'growth' ? '+' : trend === 'decline' ? '-' : ''}${scoreChangePct}%`}
          variant={getBadgeVariant(scoreChange) as 'growth' | 'stable' | 'decline'}
        />
      </div>

      {/* SERP Features Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SERP Features Breakdown (Last 30 Days)</CardTitle>
        </CardHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-lg border border-[var(--card-border)] p-3">
            <span className="text-sm text-[var(--muted)]">Local Pack</span>
            <span className="font-bold">{localPackAppearances}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[var(--card-border)] p-3">
            <span className="text-sm text-[var(--muted)]">Featured Snippets</span>
            <span className="font-bold">{featuredSnippets}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[var(--card-border)] p-3">
            <span className="text-sm text-[var(--muted)]">Knowledge Panels</span>
            <span className="font-bold">{knowledgePanels}</span>
          </div>
        </div>
      </Card>

      {/* Visual Progress Bar for SERP Coverage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SERP Feature Coverage</CardTitle>
        </CardHeader>
        <div className="space-y-2">
          <div className="h-4 w-full overflow-hidden rounded-full bg-[var(--card-border)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all"
              style={{ width: `${Math.min(serpFeatureCoverage, 100)}%` }}
            />
          </div>
          <p className="text-sm text-[var(--muted)]">
            Your business appears in {serpFeatureCoverage.toFixed(0)}% of available SERP features
          </p>
        </div>
      </Card>
    </div>
  )
}
