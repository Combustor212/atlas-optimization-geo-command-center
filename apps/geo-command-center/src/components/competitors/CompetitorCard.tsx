'use client'

import { CompetitorWithSnapshots } from '@/types/database'
import { Card } from '@/components/ui/Card'
import { TrendingUp, TrendingDown, Minus, Star, MessageSquare, MapPin, ExternalLink } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

interface CompetitorCardProps {
  data: CompetitorWithSnapshots
  onAddSnapshot?: (competitorId: string) => void
}

export function CompetitorCard({ data, onAddSnapshot }: CompetitorCardProps) {
  const { competitor, latest_rank, latest_review, review_velocity, rank_trend } = data

  const getRankTrendIcon = () => {
    if (rank_trend === 'up') return <TrendingUp className="h-4 w-4 text-[var(--success)]" />
    if (rank_trend === 'down') return <TrendingDown className="h-4 w-4 text-[var(--danger)]" />
    return <Minus className="h-4 w-4 text-[var(--muted)]" />
  }

  const getRankColor = (rank: number | null) => {
    if (!rank) return 'text-[var(--muted)]'
    if (rank <= 3) return 'text-[var(--success)]'
    if (rank <= 7) return 'text-[var(--warning)]'
    return 'text-[var(--danger)]'
  }

  return (
    <Card className="p-4 hover:border-[var(--accent)] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[var(--foreground)]">
              {competitor.name}
            </h3>
            {competitor.is_primary && (
              <span className="rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                Primary
              </span>
            )}
          </div>
          {competitor.website && (
            <a
              href={competitor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--accent)]"
            >
              <ExternalLink className="h-3 w-3" />
              {new URL(competitor.website).hostname}
            </a>
          )}
        </div>

        {/* Rank Display */}
        {latest_rank && (
          <div className="flex items-center gap-2">
            {getRankTrendIcon()}
            <div className="text-right">
              <div className={`text-2xl font-bold ${getRankColor(latest_rank.rank_position)}`}>
                #{latest_rank.rank_position}
              </div>
              <div className="text-xs text-[var(--muted)]">Rank</div>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[var(--card-border)]">
        {/* Rating */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Star className="h-4 w-4 text-[var(--warning)]" fill="currentColor" />
            <span className="font-semibold">
              {latest_review?.rating ? latest_review.rating.toFixed(1) : '—'}
            </span>
          </div>
          <div className="text-xs text-[var(--muted)]">Rating</div>
        </div>

        {/* Review Count */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <MessageSquare className="h-4 w-4 text-[var(--accent)]" />
            <span className="font-semibold">
              {latest_review?.review_count ? formatNumber(latest_review.review_count) : '—'}
            </span>
          </div>
          <div className="text-xs text-[var(--muted)]">Reviews</div>
        </div>

        {/* Review Velocity */}
        <div className="text-center">
          <div className="mb-1">
            <span className="font-semibold">
              {review_velocity > 0 ? `+${review_velocity.toFixed(1)}` : '—'}
            </span>
          </div>
          <div className="text-xs text-[var(--muted)]">Reviews/Day</div>
        </div>
      </div>

      {/* Keyword Badge */}
      {latest_rank?.keyword && (
        <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <MapPin className="h-3 w-3" />
            <span>&quot;{latest_rank.keyword}&quot;</span>
          </div>
        </div>
      )}

      {/* Add Snapshot Button (for admin/staff) */}
      {onAddSnapshot && (
        <button
          onClick={() => onAddSnapshot(competitor.id)}
          className="mt-3 w-full rounded-lg border border-[var(--card-border)] py-2 text-sm font-medium transition-colors hover:bg-[var(--card-border)]"
        >
          Add Snapshot
        </button>
      )}
    </Card>
  )
}
