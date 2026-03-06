'use client'

import { useRouter } from 'next/navigation'
import type { LeadFollowUpStatus } from '@/lib/data/leads'

const OPTIONS: { value: LeadFollowUpStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'need_to_follow_up', label: 'Need to follow up' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'followed_up', label: 'Followed up' },
  { value: 'no_answer', label: 'No answer' },
]

interface LeadFollowUpStatusSelectProps {
  leadId: string
  value: LeadFollowUpStatus | null
  onChange?: (v: LeadFollowUpStatus | null) => void
}

export function LeadFollowUpStatusSelect({
  leadId,
  value,
  onChange,
}: LeadFollowUpStatusSelectProps) {
  const router = useRouter()

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newVal = (e.target.value || null) as LeadFollowUpStatus | null
    const res = await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ follow_up_status: newVal }),
    })
    if (!res.ok) return
    onChange?.(newVal)
    router.refresh()
  }

  return (
    <select
      value={value ?? ''}
      onChange={handleChange}
      className="min-w-[120px] rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-xs hover:bg-[var(--accent-muted)] cursor-pointer"
    >
      <option value="">—</option>
      {OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
