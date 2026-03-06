'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { CitationStatus } from '@/types/database'

interface AddCitationFormProps {
  locationId: string
  onSuccess?: () => void
}

const STATUSES: { value: CitationStatus; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'missing', label: 'Missing' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'incorrect', label: 'Incorrect' },
]

export function AddCitationForm({ locationId, onSuccess }: AddCitationFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const form = e.currentTarget
    const nap_snapshot = {
      name: (form.querySelector('[name="nap_name"]') as HTMLInputElement)?.value?.trim() || undefined,
      address: (form.querySelector('[name="nap_address"]') as HTMLInputElement)?.value?.trim() || undefined,
      phone: (form.querySelector('[name="nap_phone"]') as HTMLInputElement)?.value?.trim() || undefined,
      website: (form.querySelector('[name="nap_website"]') as HTMLInputElement)?.value?.trim() || undefined,
    }
    const data = {
      directory_name: (form.querySelector('[name="directory_name"]') as HTMLInputElement)?.value?.trim(),
      url: (form.querySelector('[name="url"]') as HTMLInputElement)?.value?.trim() || null,
      status: (form.querySelector('[name="status"]') as HTMLSelectElement)?.value || 'present',
      nap_snapshot,
    }
    try {
      const res = await fetch(`/api/locations/${locationId}/citations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setIsOpen(false)
        form.reset()
        onSuccess?.()
      } else {
        const err = await res.json()
        alert(err?.error ?? 'Failed to add citation')
      }
    } catch (e) {
      console.error(e)
      alert('Failed to add citation')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent)]/90"
      >
        <Plus className="h-4 w-4" />
        Add directory
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Add directory citation</h2>
              <button type="button" onClick={() => setIsOpen(false)} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Directory name *</label>
                <input type="text" name="directory_name" required className="w-full rounded border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]" placeholder="e.g. Yelp, Yellow Pages" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">URL</label>
                <input type="url" name="url" className="w-full rounded border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]" placeholder="https://..." />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Status</label>
                <select name="status" className="w-full rounded border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]">
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="rounded border border-[var(--card-border)] p-3">
                <p className="mb-2 text-sm font-medium text-[var(--muted)]">NAP snapshot (optional)</p>
                <div className="space-y-2">
                  <input type="text" name="nap_name" className="w-full rounded border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-sm" placeholder="Name" />
                  <input type="text" name="nap_address" className="w-full rounded border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-sm" placeholder="Address" />
                  <input type="text" name="nap_phone" className="w-full rounded border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-sm" placeholder="Phone" />
                  <input type="text" name="nap_website" className="w-full rounded border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-sm" placeholder="Website" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsOpen(false)} className="rounded border border-[var(--card-border)] px-4 py-2 text-sm hover:bg-[var(--accent-muted)]">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="rounded bg-[var(--accent)] px-4 py-2 text-sm text-white disabled:opacity-50">
                  {isSubmitting ? 'Adding…' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
