'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { AddClientForm } from '@/components/clients/AddClientForm'
import { deleteClientAction } from '@/app/(dashboard)/dashboard/clients/actions'
import { useRouter } from 'next/navigation'
import { HealthScoreBadge } from '@/components/health/HealthScoreBadge'
import type { HealthScore } from '@/types/database'

interface Client {
  id: string
  name: string
  email: string
  phone?: string | null
  business_name?: string | null
}

interface ClientsViewProps {
  clients: Client[]
  healthByClient?: Record<string, HealthScore>
}

export function ClientsView({ clients, healthByClient = {} }: ClientsViewProps) {
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [showConfirm, setShowConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  function toggleClientSelection(clientId: string) {
    const newSelected = new Set(selectedClients)
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId)
    } else {
      newSelected.add(clientId)
    }
    setSelectedClients(newSelected)
  }

  function handleDeleteClick() {
    if (selectedClients.size === 0) {
      alert('Please select at least one client to delete')
      return
    }
    setShowConfirm(true)
  }

  async function handleConfirmDelete() {
    setIsDeleting(true)
    const errors: string[] = []
    
    for (const clientId of Array.from(selectedClients)) {
      const result = await deleteClientAction(clientId)
      if (result.error) {
        errors.push(result.error)
      }
    }
    
    setIsDeleting(false)
    setShowConfirm(false)
    
    if (errors.length > 0) {
      alert(`Some clients could not be deleted: ${errors.join(', ')}`)
    }
    
    setSelectedClients(new Set())
    setDeleteMode(false)
    router.refresh()
  }

  function handleCancelDelete() {
    setDeleteMode(false)
    setSelectedClients(new Set())
  }

  const selectedClientNames = Array.from(selectedClients)
    .map(id => clients.find(c => c.id === id)?.name)
    .filter(Boolean)

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Clients</h1>
          <p className="mt-1 text-[var(--muted)]">Manage your client portfolio</p>
        </div>
        <div className="flex gap-3">
          {deleteMode ? (
            <>
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:bg-[var(--muted)]/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClick}
                disabled={selectedClients.size === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected ({selectedClients.size})
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setDeleteMode(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger-muted)]/30 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete Clients
              </button>
              <AddClientForm />
            </>
          )}
        </div>
      </div>

      {clients.length === 0 ? (
        <Card className="py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-[var(--muted)]" />
          <p className="mt-4 text-[var(--muted)]">No clients yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Add clients to start tracking their GEO performance
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <div key={client.id} className="relative">
              {deleteMode ? (
                <div
                  onClick={() => toggleClientSelection(client.id)}
                  className="cursor-pointer"
                >
                  <Card className={`transition-all ${
                    selectedClients.has(client.id)
                      ? 'border-[var(--danger)] bg-[var(--danger-muted)]/10'
                      : 'hover:border-[var(--accent)]/50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedClients.has(client.id)}
                          onChange={() => toggleClientSelection(client.id)}
                          className="h-5 w-5 rounded border-[var(--card-border)] text-[var(--danger)] focus:ring-[var(--danger)] cursor-pointer"
                        />
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
                        <Users className="h-5 w-5 text-[var(--accent)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[var(--foreground)]">{client.name}</p>
                        {client.business_name && (
                          <p className="text-xs text-[var(--muted)]">{client.business_name}</p>
                        )}
                        <p className="text-sm text-[var(--muted)]">{client.email}</p>
                        {client.phone && (
                          <p className="text-xs text-[var(--muted)]">{client.phone}</p>
                        )}
                      </div>
                      {healthByClient[client.id] && (
                        <HealthScoreBadge
                          score={healthByClient[client.id].score}
                          band={healthByClient[client.id].band}
                          size="sm"
                        />
                      )}
                    </div>
                  </Card>
                </div>
              ) : (
                <Link href={`/dashboard/clients/${client.id}`}>
                  <Card className="transition-colors hover:border-[var(--accent)]/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
                        <Users className="h-5 w-5 text-[var(--accent)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[var(--foreground)]">{client.name}</p>
                        {client.business_name && (
                          <p className="text-xs text-[var(--muted)]">{client.business_name}</p>
                        )}
                        <p className="text-sm text-[var(--muted)]">{client.email}</p>
                        {client.phone && (
                          <p className="text-xs text-[var(--muted)]">{client.phone}</p>
                        )}
                      </div>
                      {healthByClient[client.id] && (
                        <HealthScoreBadge
                          score={healthByClient[client.id].score}
                          band={healthByClient[client.id].band}
                          size="sm"
                        />
                      )}
                    </div>
                  </Card>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              Remove {selectedClients.size} Client{selectedClients.size > 1 ? 's' : ''}
            </h3>
            <p className="text-[var(--muted)] mb-4">
              Are you sure you want to remove the following client{selectedClients.size > 1 ? 's' : ''}?
            </p>
            <ul className="mb-4 space-y-1 text-sm">
              {selectedClientNames.map((name, i) => (
                <li key={i} className="font-medium text-[var(--foreground)]">• {name}</li>
              ))}
            </ul>
            <p className="text-sm text-[var(--muted)] mb-6">
              This will permanently delete {selectedClients.size > 1 ? 'these clients' : 'this client'} and all associated locations, rankings, and data. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:bg-[var(--muted)]/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Removing...' : `Remove ${selectedClients.size > 1 ? 'Clients' : 'Client'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
