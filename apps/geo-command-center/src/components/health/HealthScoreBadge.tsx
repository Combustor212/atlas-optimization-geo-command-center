'use client'

import { cn } from '@/lib/utils'
import type { HealthBand } from '@/types/database'

interface HealthScoreBadgeProps {
  score: number
  band: HealthBand
  size?: 'sm' | 'md'
  className?: string
}

const bandStyles: Record<HealthBand, string> = {
  healthy: 'border-[var(--success)]/50 bg-[var(--success-muted)]/30 text-[var(--success)]',
  watch: 'border-[var(--warning)]/50 bg-[var(--warning-muted)]/30 text-[var(--warning)]',
  risk: 'border-[var(--danger)]/50 bg-[var(--danger-muted)]/30 text-[var(--danger)]',
}

export function HealthScoreBadge({ score, band, size = 'md', className }: HealthScoreBadgeProps) {
  return (
    <div
      className={cn(
        'rounded-lg border font-medium',
        bandStyles[band],
        size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm',
        className
      )}
    >
      <span className="block text-current opacity-80">{band}</span>
      <span className="block font-bold">{score}</span>
    </div>
  )
}
