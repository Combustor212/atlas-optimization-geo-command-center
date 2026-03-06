'use client'

import { UpsellOpportunityCard } from './UpsellOpportunityCard'
import type { UpsellOpportunity } from '@/lib/upsells/types'

const STATUS_COLUMNS: { status: UpsellOpportunity['status']; label: string }[] = [
  { status: 'open', label: 'Open' },
  { status: 'contacted', label: 'Contacted' },
  { status: 'won', label: 'Won' },
  { status: 'lost', label: 'Lost' },
  { status: 'dismissed', label: 'Dismissed' },
]

interface OpportunityWithMeta extends UpsellOpportunity {
  trigger?: { id: string; name: string; offer_type: string; message_template: string }
  client_name?: string
  location_name?: string | null
}

interface UpsellPipelineBoardProps {
  opportunities: OpportunityWithMeta[]
}

export function UpsellPipelineBoard({ opportunities }: UpsellPipelineBoardProps) {
  const byStatus = STATUS_COLUMNS.reduce(
    (acc, { status }) => {
      acc[status] = opportunities.filter((o) => o.status === status)
      return acc
    },
    {} as Record<string, OpportunityWithMeta[]>
  )

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STATUS_COLUMNS.map(({ status, label }) => (
        <div
          key={status}
          className="min-w-[280px] flex-1 shrink-0 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4"
        >
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            {label}
          </h3>
          <div className="space-y-3">
            {byStatus[status]?.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--muted)]">—</p>
            ) : (
              byStatus[status]?.map((opp) => (
                <UpsellOpportunityCard key={opp.id} opportunity={opp} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
