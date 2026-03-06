'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Sparkles, AlertCircle } from 'lucide-react'
import type { GeoScoreResult } from '@/lib/ai/geo-scoring'

interface GeoScoreButtonProps {
  locationId: string
  locationName: string
}

export function GeoScoreButton({ locationId, locationName }: GeoScoreButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scoreData, setScoreData] = useState<{
    score: GeoScoreResult
    factors: Record<string, unknown>
    cached?: boolean
  } | null>(null)

  async function handleCalculate(forceRefresh = false) {
    setError('')
    setScoreData(null)
    setLoading(true)

    try {
      const response = await fetch('/api/geo/calculate-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, forceRefresh }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to calculate GEO score')
        setLoading(false)
        return
      }

      setScoreData({
        score: data.data.score,
        factors: data.data.factors,
        cached: data.data.cached,
      })
      setLoading(false)
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-[var(--success)]'
    if (score >= 80) return 'text-[#4ade80]'
    if (score >= 70) return 'text-[var(--warning)]'
    if (score >= 60) return 'text-[#fb923c]'
    return 'text-[var(--danger)]'
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-5 w-5 text-[var(--success)]" />
    if (trend === 'declining') return <TrendingDown className="h-5 w-5 text-[var(--danger)]" />
    return <Minus className="h-5 w-5 text-[var(--muted)]" />
  }

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'text-[var(--danger)]'
    if (priority === 'medium') return 'text-[var(--warning)]'
    return 'text-[var(--muted)]'
  }

  return (
    <>
      <button
        onClick={() => {
          setOpen(true)
          if (!scoreData && !loading) {
            handleCalculate()
          }
        }}
        className="rounded-lg border border-purple-500 px-3 py-1.5 text-sm font-medium text-purple-500 hover:bg-purple-500 hover:text-white transition-colors flex items-center gap-2"
        title="Calculate AI-powered GEO score"
      >
        <Sparkles className="h-4 w-4" />
        AI Score
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
            {loading ? (
              /* Loading screen: no results until scan completes */
              <div className="relative flex min-h-[320px] flex-col items-center justify-center py-16">
                <button
                  onClick={() => setOpen(false)}
                  className="absolute right-0 top-0 text-[var(--muted)] hover:text-[var(--foreground)]"
                  aria-label="Close"
                >
                  ✕
                </button>
                <div className="h-14 w-14 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
                <h3 className="mt-6 text-xl font-semibold text-[var(--foreground)]">
                  Scan in progress
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Analyzing rankings, reviews, competitive landscape, and AI visibility…
                </p>
                <p className="mt-4 text-sm font-medium text-[var(--muted)]">
                  Estimated wait: ~15–30 seconds
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Results will appear when the scan is complete
                </p>
              </div>
            ) : error ? (
              <>
                <div className="flex items-start justify-between">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    AI-Powered GEO Score
                  </h3>
                  <button
                    onClick={() => setOpen(false)}
                    className="text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-4 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-[var(--danger)] flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-[var(--danger)]">{error}</p>
                  </div>
                </div>
              </>
            ) : scoreData ? (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      AI-Powered GEO Score
                    </h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {locationName}
                      {scoreData?.cached && (
                        <span className="ml-2 text-xs text-[var(--muted)]">(cached)</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-6 space-y-6">
                {/* Overall Score */}
                <div className="rounded-xl border border-[var(--card-border)] bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--muted)] mb-1">Overall GEO Score</p>
                      <div className="flex items-end gap-3">
                        <span className={`text-5xl font-bold ${getScoreColor(scoreData.score.score)}`}>
                          {scoreData.score.score}
                        </span>
                        <span className="text-2xl font-bold text-[var(--muted)] mb-1">/100</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`text-2xl font-bold ${getScoreColor(scoreData.score.score)}`}>
                          {scoreData.score.grade}
                        </span>
                        <div className="flex items-center gap-1">
                          {getTrendIcon(scoreData.score.trend)}
                          <span className="text-sm text-[var(--muted)] capitalize">
                            {scoreData.score.trend}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[var(--muted)]">AI Confidence</p>
                      <p className="text-3xl font-bold text-[var(--foreground)]">
                        {scoreData.score.confidence}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="rounded-lg border border-[var(--card-border)] p-4">
                  <h4 className="font-semibold mb-3">Score Breakdown</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-[var(--muted)] mb-1">Rankings</p>
                      <p className="text-2xl font-bold">
                        {scoreData.score.breakdown.rankingScore.toFixed(2).replace(/\.00$/, '')}
                        <span className="text-sm text-[var(--muted)]">/40</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)] mb-1">Profile Quality</p>
                      <p className="text-2xl font-bold">
                        {scoreData.score.breakdown.profileScore.toFixed(2).replace(/\.00$/, '')}
                        <span className="text-sm text-[var(--muted)]">/30</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)] mb-1">Competitive Edge</p>
                      <p className="text-2xl font-bold">
                        {scoreData.score.breakdown.competitiveScore.toFixed(2).replace(/\.00$/, '')}
                        <span className="text-sm text-[var(--muted)]">/20</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)] mb-1">Local Signals</p>
                      <p className="text-2xl font-bold">
                        {scoreData.score.breakdown.signalsScore.toFixed(2).replace(/\.00$/, '')}
                        <span className="text-sm text-[var(--muted)]">/10</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* SWOT Analysis */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-[var(--card-border)] p-4">
                    <h4 className="font-semibold mb-2 text-[var(--success)]">💪 Strengths</h4>
                    <ul className="space-y-1 text-sm">
                      {scoreData.score.analysis.strengths.map((strength, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-[var(--success)]">•</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-[var(--card-border)] p-4">
                    <h4 className="font-semibold mb-2 text-[var(--danger)]">⚠️ Weaknesses</h4>
                    <ul className="space-y-1 text-sm">
                      {scoreData.score.analysis.weaknesses.map((weakness, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-[var(--danger)]">•</span>
                          <span>{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-[var(--card-border)] p-4">
                    <h4 className="font-semibold mb-2 text-[var(--accent)]">🎯 Opportunities</h4>
                    <ul className="space-y-1 text-sm">
                      {scoreData.score.analysis.opportunities.map((opportunity, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-[var(--accent)]">•</span>
                          <span>{opportunity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-[var(--card-border)] p-4">
                    <h4 className="font-semibold mb-2 text-[var(--warning)]">🚨 Threats</h4>
                    <ul className="space-y-1 text-sm">
                      {scoreData.score.analysis.threats.map((threat, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-[var(--warning)]">•</span>
                          <span>{threat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="rounded-lg border border-[var(--card-border)] p-4">
                  <h4 className="font-semibold mb-3">🎯 AI Recommendations</h4>
                  <div className="space-y-3">
                    {scoreData.score.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-xs font-semibold uppercase ${getPriorityColor(rec.priority)}`}
                              >
                                {rec.priority} priority
                              </span>
                              <span className="text-xs text-[var(--muted)]">
                                {rec.effort === 'easy' ? '🟢' : rec.effort === 'moderate' ? '🟡' : '🔴'}{' '}
                                {rec.effort}
                              </span>
                            </div>
                            <p className="font-medium text-sm mb-1">{rec.action}</p>
                            <p className="text-xs text-[var(--muted)]">
                              <strong>Impact:</strong> {rec.impact}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Refresh Button */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleCalculate(true)}
                    disabled={loading}
                    className="flex-1 rounded-lg border border-[var(--accent)] py-2 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Recalculating...' : 'Recalculate Score'}
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="px-6 rounded-lg bg-[var(--accent)] py-2 text-white hover:opacity-90 transition-opacity"
                  >
                    Done
                  </button>
                </div>

                <p className="text-xs text-center text-[var(--muted)]">
                  Powered by OpenAI GPT-4 • Analysis based on current data and local SEO best practices
                </p>
              </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  )
}
