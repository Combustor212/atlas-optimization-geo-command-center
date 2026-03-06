'use client'

import { useState, useEffect } from 'react'
import { CompetitorWithSnapshots } from '@/types/database'
import { Card } from '@/components/ui/Card'
import { CompetitorCard } from './CompetitorCard'
import { AddCompetitorForm } from './AddCompetitorForm'
import { Users, TrendingUp, Star } from 'lucide-react'

interface CompetitorsTabProps {
  locationId: string
  isAdmin?: boolean
}

export function CompetitorsTab({ locationId, isAdmin = false }: CompetitorsTabProps) {
  const [competitors, setCompetitors] = useState<CompetitorWithSnapshots[]>([])
  const [loading, setLoading] = useState(true)

  const loadCompetitors = async () => {
    try {
      const response = await fetch(`/api/locations/${locationId}/competitors`)
      if (response.ok) {
        const data = await response.json()
        setCompetitors(data.competitors || [])
      }
    } catch (error) {
      console.error('Error loading competitors:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCompetitors()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadCompetitors depends on locationId only
  }, [locationId])

  if (loading) {
    return (
      <div className="py-12 text-center text-[var(--muted)]">
        Loading competitors...
      </div>
    )
  }

  // Calculate summary stats
  const summary = {
    total: competitors.length,
    avgRating: competitors.reduce((sum, c) => sum + (c.latest_review?.rating || 0), 0) / competitors.length || 0,
    avgRank: competitors.reduce((sum, c) => sum + (c.latest_rank?.rank_position || 999), 0) / competitors.length || 0,
    totalReviews: competitors.reduce((sum, c) => sum + (c.latest_review?.review_count || 0), 0),
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Competitor Intelligence</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Track and compare competitor performance
          </p>
        </div>
        {isAdmin && <AddCompetitorForm locationId={locationId} onSuccess={loadCompetitors} />}
      </div>

      {/* Summary Cards */}
      {competitors.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-[var(--accent)]" />
              <div>
                <p className="text-sm text-[var(--muted)]">Competitors Tracked</p>
                <p className="text-xl font-bold">{summary.total}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-[var(--accent)]" />
              <div>
                <p className="text-sm text-[var(--muted)]">Avg Competitor Rank</p>
                <p className="text-xl font-bold">
                  {summary.avgRank < 100 ? `#${summary.avgRank.toFixed(1)}` : '—'}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <Star className="h-8 w-8 text-[var(--accent)]" />
              <div>
                <p className="text-sm text-[var(--muted)]">Avg Competitor Rating</p>
                <p className="text-xl font-bold">
                  {summary.avgRating > 0 ? summary.avgRating.toFixed(1) : '—'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Competitor Grid */}
      {competitors.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {competitors.map((comp) => (
            <CompetitorCard
              key={comp.competitor.id}
              data={comp}
              onAddSnapshot={isAdmin ? () => {/* TODO: Add snapshot modal */} : undefined}
            />
          ))}
        </div>
      ) : (
        <Card>
          <div className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-[var(--muted)]" />
            <h3 className="mt-4 text-lg font-medium">No Competitors Yet</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {isAdmin
                ? 'Add competitors to start tracking their performance'
                : 'Your agency will add competitors to track'}
            </p>
            {isAdmin && (
              <div className="mt-6">
                <AddCompetitorForm locationId={locationId} onSuccess={loadCompetitors} />
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
