'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { ScoreCard } from './ScoreCard'
import type { UnifiedScoreResult } from '@/lib/scores/types'
import { RefreshCw } from 'lucide-react'

interface UnifiedScoresCardProps {
  clientId: string
  locationId?: string | null
  initialData?: UnifiedScoreResult | null
}

export function UnifiedScoresCard({
  clientId,
  locationId,
  initialData,
}: UnifiedScoresCardProps) {
  const [data, setData] = useState<UnifiedScoreResult | null>(initialData ?? null)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState('')

  async function fetchScores() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ client_id: clientId })
      if (locationId) params.set('location_id', locationId)
      const res = await fetch(`/api/scores/unified?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load scores')
      setData(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load scores')
    } finally {
      setLoading(false)
    }
  }

  async function recalculateAndStore() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/scores/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, location_id: locationId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to calculate')
      setData(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to calculate')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!initialData) fetchScores()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, locationId])

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>MEO / GEO Scores</CardTitle>
        </CardHeader>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--accent)]/30 border-t-[var(--accent)]" />
          <p className="mt-4 font-medium text-[var(--foreground)]">Scan in progress</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Estimated wait: ~5–15 seconds</p>
          <p className="mt-2 text-xs text-[var(--muted)]">Results will appear when complete</p>
        </div>
      </Card>
    )
  }

  if (error && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>MEO / GEO Scores</CardTitle>
        </CardHeader>
        <div className="p-4 text-sm text-[var(--danger)]">{error}</div>
        <div className="border-t border-[var(--card-border)] p-4">
          <button
            onClick={fetchScores}
            className="rounded-lg border border-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
          >
            Retry
          </button>
        </div>
      </Card>
    )
  }

  if (!data) return null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>MEO / GEO Scores</CardTitle>
        <button
          onClick={recalculateAndStore}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--accent-muted)] disabled:opacity-50"
        >
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          Recalculate
        </button>
      </CardHeader>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--accent)]/30 border-t-[var(--accent)]" />
          <p className="mt-4 font-medium text-[var(--foreground)]">Scan in progress</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Estimated wait: ~5–15 seconds</p>
          <p className="mt-2 text-xs text-[var(--muted)]">Results will appear when complete</p>
        </div>
      ) : (
        <div className="space-y-4 px-4 pb-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ScoreCard label="MEO" score={data.scores.meo} meta={data.score_meta.meo} />
            <ScoreCard
              label="GEO"
              score={data.scores.geo}
              meta={data.score_meta.geo}
              beta={data.geoBeta}
            />
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--accent-muted)]/30 p-4">
              <p className="text-sm font-medium text-[var(--muted)]">Overall</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {data.scores.final}
                <span className="text-base font-normal text-[var(--muted)]">/100</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
