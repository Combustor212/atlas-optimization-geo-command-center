'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { ReviewForecast } from '@/types/database'
import { Star, RefreshCw, Loader2 } from 'lucide-react'

interface ReviewVelocityCardProps {
  locationId: string
  locationName: string
  isAdmin?: boolean
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatNumber(n: number): string {
  if (n >= 10) return Math.round(n).toString()
  return n.toFixed(1)
}

export function ReviewVelocityCard({
  locationId,
  locationName,
  isAdmin = false,
}: ReviewVelocityCardProps) {
  const [forecast, setForecast] = useState<ReviewForecast | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/locations/${locationId}/reviews/forecast`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json) setForecast(json.forecast ?? null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [locationId])

  const refetchForecast = async () => {
    const res = await fetch(`/api/locations/${locationId}/reviews/forecast`)
    if (!res.ok) return
    const json = await res.json()
    setForecast(json.forecast ?? null)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetch(`/api/locations/${locationId}/reviews/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      await refetchForecast()
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-[var(--accent)]" />
            <CardTitle>Review velocity — {locationName}</CardTitle>
          </div>
        </CardHeader>
        <div className="flex items-center gap-2 py-6 text-[var(--muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </Card>
    )
  }

  if (!forecast) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-[var(--accent)]" />
              <CardTitle>Review velocity — {locationName}</CardTitle>
            </div>
            {isAdmin && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent)]/90 disabled:opacity-60"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Generate forecast
              </button>
            )}
          </div>
        </CardHeader>
        <p className="text-sm text-[var(--muted)]">
          No forecast yet. Add review snapshots for this location, then generate a forecast.
        </p>
      </Card>
    )
  }

  const velocity = Number(forecast.current_velocity_per_day)
  const reviewsPerWeek = velocity * 7
  const reviewsPerMonth = velocity * 30

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-[var(--accent)]" />
            <CardTitle>Review velocity — {locationName}</CardTitle>
          </div>
          {isAdmin && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--card)] disabled:opacity-60"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh forecast
            </button>
          )}
        </div>
      </CardHeader>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-sm text-[var(--muted)]">Reviews / week</p>
          <p className="text-xl font-bold">{formatNumber(reviewsPerWeek)}</p>
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">Reviews / month</p>
          <p className="text-xl font-bold">{formatNumber(reviewsPerMonth)}</p>
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">90-day projected</p>
          <p className="text-xl font-bold">{forecast.projected_review_count}</p>
        </div>
        {forecast.goal_review_count != null && forecast.estimated_date_to_goal && (
          <div>
            <p className="text-sm text-[var(--muted)]">Estimated date to surpass competitor</p>
            <p className="text-xl font-bold text-[var(--success)]">
              {formatDate(forecast.estimated_date_to_goal)}
            </p>
          </div>
        )}
      </div>
      {forecast.goal_review_count != null && !forecast.estimated_date_to_goal && (
        <p className="mt-2 text-sm text-[var(--muted)]">
          Goal: {forecast.goal_review_count} reviews (velocity too low or already ahead)
        </p>
      )}
    </Card>
  )
}
