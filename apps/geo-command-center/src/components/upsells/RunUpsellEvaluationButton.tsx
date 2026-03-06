'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Loader2 } from 'lucide-react'

interface RunUpsellEvaluationButtonProps {
  triggerCount: number
}

export function RunUpsellEvaluationButton({ triggerCount }: RunUpsellEvaluationButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ created: number } | null>(null)

  async function handleRun() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/upsells/run', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to run evaluation')
      setResult(data)
      if (data.created > 0) router.refresh()
    } catch {
      setResult({ created: -1 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result !== null && (
        <span className="text-sm text-[var(--muted)]">
          {result.created >= 0
            ? `Created ${result.created} new opportunity(ies)`
            : 'Evaluation failed'}
        </span>
      )}
      <button
        onClick={handleRun}
        disabled={loading || triggerCount === 0}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        Run evaluation
      </button>
    </div>
  )
}
