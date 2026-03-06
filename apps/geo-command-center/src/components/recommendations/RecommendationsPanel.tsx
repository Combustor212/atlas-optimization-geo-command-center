'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Lightbulb, Loader2, Check, X, ChevronDown } from 'lucide-react'

export interface Recommendation {
  id: string
  agency_id: string
  client_id: string
  location_id: string
  type: string
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
  expected_impact: Record<string, unknown>
  status: 'open' | 'in_progress' | 'done' | 'dismissed'
  created_by: string
  created_at: string
  updated_at: string
}

interface RecommendationsPanelProps {
  locationId: string
  locationName?: string
  isAdmin?: boolean
}

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

const TYPE_LABELS: Record<string, string> = {
  reviews: 'Reviews',
  gmb: 'GMB',
  content: 'Content',
  citations: 'Citations',
  technical: 'Technical',
  ai_visibility: 'AI Visibility',
  search_visibility: 'Search Visibility',
}

export function RecommendationsPanel({
  locationId,
  locationName,
  isAdmin = false,
}: RecommendationsPanelProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [filterSeverity, setFilterSeverity] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterSeverity) params.set('severity', filterSeverity)
      if (filterStatus) params.set('status', filterStatus)
      if (filterType) params.set('type', filterType)
      const qs = params.toString()
      const url = `/api/locations/${locationId}/recommendations${qs ? `?${qs}` : ''}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setRecommendations(data.recommendations ?? [])
      }
    } catch (e) {
      console.error('Failed to fetch recommendations', e)
    } finally {
      setLoading(false)
    }
  }, [locationId, filterSeverity, filterStatus, filterType])

  useEffect(() => {
    fetchRecommendations()
  }, [fetchRecommendations])

  const handleGenerate = async () => {
    try {
      setGenerating(true)
      const res = await fetch(`/api/locations/${locationId}/recommendations/generate`, {
        method: 'POST',
      })
      if (res.ok) {
        await fetchRecommendations()
      } else {
        const err = await res.json()
        alert(err?.error || 'Failed to generate recommendations')
      }
    } catch (e) {
      console.error('Generate failed', e)
      alert('Failed to generate recommendations')
    } finally {
      setGenerating(false)
    }
  }

  const handleStatusChange = async (id: string, status: 'done' | 'dismissed') => {
    try {
      const res = await fetch(`/api/recommendations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        await fetchRecommendations()
      }
    } catch (e) {
      console.error('Status update failed', e)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-[var(--accent)]" />
            Recommendations
            {locationName && (
              <span className="text-sm font-normal text-[var(--muted)]">— {locationName}</span>
            )}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Actionable insights to improve local visibility and rankings
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Lightbulb className="h-4 w-4" />
                Generate
              </>
            )}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-1 rounded border border-[var(--card-border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--card)]"
        >
          Filters
          <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
        {showFilters && (
          <>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="rounded border border-[var(--card-border)] bg-transparent px-3 py-1.5 text-sm"
            >
              <option value="">All severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded border border-[var(--card-border)] bg-transparent px-3 py-1.5 text-sm"
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
              <option value="dismissed">Dismissed</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded border border-[var(--card-border)] bg-transparent px-3 py-1.5 text-sm"
            >
              <option value="">All types</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-[var(--muted)]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : recommendations.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <Lightbulb className="mx-auto h-12 w-12 text-[var(--muted)]" />
            <h3 className="mt-4 text-lg font-medium">No recommendations yet</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {isAdmin
                ? 'Click "Generate" to create actionable recommendations based on location data.'
                : 'Your agency will generate recommendations for this location.'}
            </p>
            {isAdmin && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate recommendations'
                )}
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <Card
              key={rec.id}
              className={`${
                rec.status === 'dismissed' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                        rec.severity === 'high'
                          ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                          : rec.severity === 'medium'
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                            : 'bg-slate-500/20 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {SEVERITY_LABELS[rec.severity] ?? rec.severity}
                    </span>
                    <span className="rounded bg-[var(--card-border)] px-2 py-0.5 text-xs text-[var(--muted)]">
                      {TYPE_LABELS[rec.type] ?? rec.type}
                    </span>
                    <span className="rounded px-2 py-0.5 text-xs text-[var(--muted)]">
                      {rec.status}
                    </span>
                  </div>
                  <h4 className="mt-2 font-semibold text-[var(--foreground)]">{rec.title}</h4>
                  <p className="mt-1 text-sm text-[var(--muted)]">{rec.description}</p>
                  {rec.expected_impact &&
                    typeof rec.expected_impact === 'object' &&
                    Object.keys(rec.expected_impact).length > 0 && (
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        Expected impact:{' '}
                        {rec.expected_impact.estimated_lift != null &&
                        rec.expected_impact.timeframe
                          ? `~${rec.expected_impact.estimated_lift} ${rec.expected_impact.metric ?? 'improvement'} in ${rec.expected_impact.timeframe}`
                          : JSON.stringify(rec.expected_impact)}
                      </p>
                    )}
                </div>
                {isAdmin && rec.status === 'open' && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleStatusChange(rec.id, 'done')}
                      className="inline-flex items-center gap-1 rounded border border-[var(--success)] px-3 py-1.5 text-sm text-[var(--success)] hover:bg-[var(--success)]/10"
                    >
                      <Check className="h-4 w-4" />
                      Done
                    </button>
                    <button
                      onClick={() => handleStatusChange(rec.id, 'dismissed')}
                      className="inline-flex items-center gap-1 rounded border border-[var(--muted)] px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--card)]"
                    >
                      <X className="h-4 w-4" />
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
