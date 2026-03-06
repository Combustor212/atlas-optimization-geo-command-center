'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UpsellOpportunityStatusSelect } from './UpsellOpportunityStatusSelect'
import type { UpsellOpportunity } from '@/lib/upsells/types'

interface OpportunityWithMeta extends UpsellOpportunity {
  trigger?: { id: string; name: string; offer_type: string; message_template: string }
  client_name?: string
  location_name?: string | null
}

interface UpsellOpportunityCardProps {
  opportunity: OpportunityWithMeta
}

const OFFER_LABELS: Record<string, string> = {
  ads: 'Ads',
  cro: 'CRO',
  content: 'Content',
  reputation: 'Reputation',
  ai_pr: 'AI PR',
  other: 'Other',
}

export function UpsellOpportunityCard({ opportunity }: UpsellOpportunityCardProps) {
  const [status, setStatus] = useState(opportunity.status)
  const trigger = opportunity.trigger
  const offerLabel = trigger ? OFFER_LABELS[trigger.offer_type] ?? trigger.offer_type : '—'

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/clients/${opportunity.client_id}`}
            className="font-medium text-[var(--foreground)] hover:underline"
          >
            {opportunity.client_name ?? 'Unknown client'}
          </Link>
          {opportunity.location_name && (
            <p className="mt-0.5 text-xs text-[var(--muted)]">{opportunity.location_name}</p>
          )}
          <p className="mt-1 text-xs font-medium text-[var(--accent)]">
            {trigger?.name ?? 'Trigger'} · {offerLabel}
          </p>
        </div>
        <UpsellOpportunityStatusSelect
          opportunityId={opportunity.id}
          value={status}
          onChange={setStatus}
        />
      </div>
    </div>
  )
}
