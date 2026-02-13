import { cn } from '@/lib/utils'

type BadgeVariant = 'growth' | 'stable' | 'decline'

interface PerformanceBadgeProps {
  label: string
  value: string
  variant: BadgeVariant
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  growth: 'border-[var(--success)]/50 bg-[var(--success-muted)]/30 text-[var(--success)]',
  stable: 'border-[var(--warning)]/50 bg-[var(--warning-muted)]/30 text-[var(--warning)]',
  decline: 'border-[var(--danger)]/50 bg-[var(--danger-muted)]/30 text-[var(--danger)]',
}

export function PerformanceBadge({ label, value, variant, className }: PerformanceBadgeProps) {
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2 text-sm font-medium',
        variantStyles[variant],
        className
      )}
    >
      <span className="block text-xs opacity-80">{label}</span>
      <span className="block font-semibold">{value}</span>
    </div>
  )
}

export function getBadgeVariant(change: number): BadgeVariant {
  if (change > 0) return 'growth'
  if (change < 0) return 'decline'
  return 'stable'
}
