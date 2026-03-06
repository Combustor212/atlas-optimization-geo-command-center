'use client'

import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { PerformanceBadge, getBadgeVariant } from '@/components/ui/PerformanceBadge'
import { Brain, Sparkles, TrendingUp, MessageSquare } from 'lucide-react'

interface AIVisibilitySummaryProps {
  avgScore: number
  mentionCount: number
  platforms: string[]
  trend: 'growth' | 'stable' | 'decline'
  recentScore: number
  previousScore: number
}

export function AIVisibilitySummary({
  avgScore,
  mentionCount,
  platforms,
  trend,
  recentScore,
  previousScore,
}: AIVisibilitySummaryProps) {
  const scoreChange = recentScore - previousScore
  const scoreChangePct = previousScore > 0 ? ((scoreChange / previousScore) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <div className="flex items-center gap-3">
            <Brain className="h-8 w-8 text-[var(--accent)]" />
            <div>
              <p className="text-sm text-[var(--muted)]">AI Visibility Score</p>
              <p className="text-xl font-bold">{avgScore.toFixed(1)}/100</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-[var(--accent)]" />
            <div>
              <p className="text-sm text-[var(--muted)]">Total Mentions</p>
              <p className="text-xl font-bold">{mentionCount}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-[var(--accent)]" />
            <div>
              <p className="text-sm text-[var(--muted)]">Platforms Tracked</p>
              <p className="text-xl font-bold">{platforms.length}</p>
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
          label="AI Visibility Trend"
          value={`${trend === 'growth' ? '+' : trend === 'decline' ? '-' : ''}${scoreChangePct}%`}
          variant={getBadgeVariant(scoreChange) as 'growth' | 'stable' | 'decline'}
        />
      </div>

      {/* Platform Breakdown */}
      {platforms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform Coverage</CardTitle>
          </CardHeader>
          <div className="flex flex-wrap gap-2">
            {platforms.map((platform) => (
              <span
                key={platform}
                className="rounded-full bg-[var(--accent)]/20 px-3 py-1 text-sm font-medium capitalize"
              >
                {platform}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
