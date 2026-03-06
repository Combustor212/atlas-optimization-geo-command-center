'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface AddCompetitorFormProps {
  locationId: string
  onSuccess?: () => void
}

export function AddCompetitorForm({ locationId, onSuccess }: AddCompetitorFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      location_id: locationId,
      name: formData.get('name'),
      google_place_id: formData.get('google_place_id') || null,
      website: formData.get('website') || null,
      is_primary: formData.get('is_primary') === 'on',
      notes: formData.get('notes') || null,
    }

    try {
      const response = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        setIsOpen(false)
        e.currentTarget.reset()
        if (onSuccess) onSuccess()
      } else {
        const error = await response.json()
        alert(`Failed to add competitor: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error adding competitor:', error)
      alert('Failed to add competitor')
    }

    setIsSubmitting(false)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent)]/90"
      >
        <Plus className="h-4 w-4" />
        Add Competitor
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-[var(--card)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Add Competitor</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Competitor Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g., ABC Plumbing Co."
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Google Place ID</label>
                <input
                  type="text"
                  name="google_place_id"
                  placeholder="ChIJ..."
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                />
                <p className="mt-1 text-xs text-[var(--muted)]">
                  For automated tracking (optional)
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Website</label>
                <input
                  type="url"
                  name="website"
                  placeholder="https://example.com"
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="is_primary" className="rounded" />
                  <span className="text-sm font-medium">Mark as primary competitor</span>
                </label>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Additional information..."
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--card-border)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent)]/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add Competitor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
