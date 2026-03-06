'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteClientAction } from '@/app/(dashboard)/dashboard/clients/actions'
import { useRouter } from 'next/navigation'

interface DeleteClientButtonProps {
  clientId: string
  clientName: string
  redirectAfterDelete?: boolean
}

export function DeleteClientButton({ clientId, clientName, redirectAfterDelete = true }: DeleteClientButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDeleting(true)
    const result = await deleteClientAction(clientId)
    if (result.error) {
      alert(result.error)
      setIsDeleting(false)
      setShowConfirm(false)
    } else {
      if (redirectAfterDelete) {
        router.push('/dashboard/clients')
      }
      router.refresh()
    }
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowConfirm(true)
        }}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger-muted)]/30 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
        Remove Client
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            e.stopPropagation()
            setShowConfirm(false)
          }}
        >
          <div
            className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              Remove Client
            </h3>
            <p className="text-[var(--muted)] mb-6">
              Are you sure you want to remove <span className="font-medium text-[var(--foreground)]">{clientName}</span>? 
              This will permanently delete the client and all associated locations, rankings, and data. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowConfirm(false)
                }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:bg-[var(--muted)]/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Removing...' : 'Remove Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
