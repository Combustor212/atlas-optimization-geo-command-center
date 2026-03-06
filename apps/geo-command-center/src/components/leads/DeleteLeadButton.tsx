'use client'

import { Trash2 } from 'lucide-react'
import { deleteLeadFormAction } from '@/app/(dashboard)/dashboard/leads/actions'

interface DeleteLeadButtonProps {
  leadId: string
}

export function DeleteLeadButton({ leadId }: DeleteLeadButtonProps) {
  return (
    <form
      action={deleteLeadFormAction}
      onSubmit={(e) => {
        if (!confirm('Remove this lead? This cannot be undone.')) {
          e.preventDefault()
        }
      }}
      className="inline-block"
    >
      <input type="hidden" name="leadId" value={leadId} />
      <button
        type="submit"
        className="inline-flex min-w-[36px] min-h-[36px] items-center justify-center rounded p-2 text-[var(--muted)] hover:bg-[var(--destructive)]/20 hover:text-[var(--destructive)] transition-colors"
        title="Remove lead"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  )
}
