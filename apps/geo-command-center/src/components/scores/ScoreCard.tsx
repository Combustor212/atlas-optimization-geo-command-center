'use client'

import { useState } from 'react'
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import type { PillarMeta, ConfidenceLevel } from '@/lib/scores/types'

interface ScoreCardProps {
  label: string
  score: number
  meta: PillarMeta
  beta?: boolean
}

const confidenceStyles: Record<ConfidenceLevel, string> = {
  high: 'bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/40',
  medium: 'bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/40',
  low: 'bg-[var(--muted)]/30 text-[var(--muted)] border-[var(--card-border)]',
}

export function ScoreCard({ label, score, meta, beta }: ScoreCardProps) {
  const [breakdownOpen, setBreakdownOpen] = useState(false)

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-[var(--success)]'
    if (s >= 60) return 'text-[var(--warning)]'
    return 'text-[var(--danger)]'
  }

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
            {beta && (
              <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-400">
                Beta
              </span>
            )}
          </div>
          <p className={`text-2xl font-bold ${getScoreColor(score)}`}>
            {score}
            <span className="text-base font-normal text-[var(--muted)]">/100</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded border px-2 py-0.5 text-xs font-medium ${confidenceStyles[meta.confidence]}`}
            title={meta.why}
          >
            {meta.confidence}
          </span>
          {meta.why && (
            <span
              className="cursor-help text-[var(--muted)]"
              title={meta.why}
            >
              <HelpCircle className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setBreakdownOpen(!breakdownOpen)}
        className="mt-3 flex w-full items-center justify-between text-left text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <span>Breakdown</span>
        {breakdownOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {breakdownOpen && meta.breakdown.factors.length > 0 && (
        <div className="mt-2 space-y-1.5 rounded border border-[var(--card-border)] bg-[var(--background)] p-3 text-sm">
          {meta.breakdown.factors.map((f, i) => (
            <div key={i} className="flex justify-between gap-2">
              <span className="text-[var(--muted)]">{f.label}</span>
              <span className="font-medium">{f.value.toFixed(1)} pts</span>
            </div>
          ))}
          {meta.breakdown.dataSources.length > 0 && (
            <p className="pt-2 text-xs text-[var(--muted)]">
              Sources: {meta.breakdown.dataSources.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
