'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import type { UpsellOpportunityStatus } from '@/lib/upsells/types'

const OPTIONS: { value: UpsellOpportunityStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'dismissed', label: 'Dismissed' },
]

interface UpsellOpportunityStatusSelectProps {
  opportunityId: string
  value: UpsellOpportunityStatus
  onChange: (v: UpsellOpportunityStatus) => void
}

export function UpsellOpportunityStatusSelect({
  opportunityId,
  value,
  onChange,
}: UpsellOpportunityStatusSelectProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleSelect(newStatus: UpsellOpportunityStatus) {
    const res = await fetch(`/api/upsell-opportunities/${opportunityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) return
    onChange(newStatus)
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-0.5 rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-xs hover:bg-[var(--accent-muted)]"
      >
        {OPTIONS.find((o) => o.value === value)?.label ?? value}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[120px] rounded border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg">
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className="block w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--accent-muted)]"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
