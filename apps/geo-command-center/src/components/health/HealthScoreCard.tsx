'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { HealthScoreBadge } from '@/components/health/HealthScoreBadge'
import type { HealthScore } from '@/types/database'
import { RefreshCw, TrendingDown, HelpCircle } from 'lucide-react'

interface HealthScoreCardProps {
  clientId: string
  latest: HealthScore | null
  history: HealthScore[]
  showRecalculate?: boolean
  /** Portal: read-only, show "what to improve" only */
  readOnly?: boolean
}

export function HealthScoreCard({
  clientId,
  latest,
  history,
  showRecalculate = true,
  readOnly = false,
}: HealthScoreCardProps) {
  const [isRecalculating, setIsRecalculating] = useState(false)

  async function handleRecalculate() {
    setIsRecalculating(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/health/recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        window.location.reload()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to recalculate')
      }
    } finally {
      setIsRecalculating(false)
    }
  }

  const current = latest ?? history[0] ?? null
  if (!current) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HelpCircle className="h-5 w-5 text-[var(--muted)]" />
            Client Health Score
          </CardTitle>
        </CardHeader>
        <div className="p-4 text-sm text-[var(--muted)]">
          No health score yet. Run a calculation to see score and churn risk band.
        </div>
        {showRecalculate && !readOnly && (
          <div className="border-t border-[var(--card-border)] p-4">
            <button
              onClick={handleRecalculate}
              disabled={isRecalculating}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              <RefreshCw className={isRecalculating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              {isRecalculating ? 'Calculating…' : 'Calculate health score'}
            </button>
          </div>
        )}
      </Card>
    )
  }

  const factors = current ? Object.values(current.factors) : []
  const sortedFactors = [...factors].sort((a, b) => a.normalized - b.normalized)
  const toImprove = sortedFactors.filter((f) => f.normalized < 0.6).slice(0, 4)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Client Health Score</CardTitle>
        <HealthScoreBadge score={current.score} band={current.band} size="md" />
      </CardHeader>
      <div className="space-y-4 px-4 pb-4">
        {history.length >= 1 && (
          <div className="text-xs text-[var(--muted)]">
            Last calculated: {new Date(current.calculated_at).toLocaleString()}
          </div>
        )}
        {toImprove.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1 text-sm font-medium text-[var(--foreground)]">
              <TrendingDown className="h-4 w-4 text-[var(--warning)]" />
              What to improve
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-[var(--muted)]">
              {toImprove.map((f) => (
                <li key={f.label}>{f.label} (impact: {(f.weight * 100).toFixed(0)}%)</li>
              ))}
            </ul>
          </div>
        )}
        {factors.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-[var(--muted)] hover:text-[var(--foreground)]">
              Factor breakdown
            </summary>
            <ul className="mt-2 space-y-1 text-[var(--muted)]">
              {factors.map((f) => (
                <li key={f.label}>
                  {f.label}: {(f.normalized * 100).toFixed(0)}% → +{(f.contribution * 100).toFixed(1)} pts
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
      {showRecalculate && !readOnly && (
        <div className="border-t border-[var(--card-border)] p-4">
          <button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--muted)]/10 disabled:opacity-50"
          >
            <RefreshCw className={isRecalculating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            {isRecalculating ? 'Recalculating…' : 'Recalculate'}
          </button>
        </div>
      )}
    </Card>
  )
}
