'use client'

import { useState } from 'react'
import { Settings, X } from 'lucide-react'
import type { NapProfile } from '@/types/database'

interface NapProfileFormProps {
  locationId: string
  initialProfile: NapProfile | null
  onSuccess?: () => void
}

export function NapProfileForm({ locationId, initialProfile, onSuccess }: NapProfileFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const form = e.currentTarget
    const data = {
      canonical_name: (form.querySelector('[name="canonical_name"]') as HTMLInputElement)?.value?.trim(),
      canonical_address: (form.querySelector('[name="canonical_address"]') as HTMLInputElement)?.value?.trim(),
      canonical_phone: (form.querySelector('[name="canonical_phone"]') as HTMLInputElement)?.value?.trim(),
      canonical_website: (form.querySelector('[name="canonical_website"]') as HTMLInputElement)?.value?.trim() || null,
    }
    try {
      const res = await fetch(`/api/locations/${locationId}/nap-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setIsOpen(false)
        onSuccess?.()
      } else {
        const err = await res.json()
        alert(err?.error ?? 'Failed to save NAP profile')
      }
    } catch (e) {
      console.error(e)
      alert('Failed to save NAP profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--accent-muted)]"
      >
        <Settings className="h-4 w-4" />
        {initialProfile ? 'Edit NAP profile' : 'Set NAP profile'}
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Canonical NAP profile</h2>
              <button type="button" onClick={() => setIsOpen(false)} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Canonical name *</label>
                <input type="text" name="canonical_name" required defaultValue={initialProfile?.canonical_name} className="w-full rounded border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]" placeholder="Business name" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Canonical address *</label>
                <input type="text" name="canonical_address" required defaultValue={initialProfile?.canonical_address} className="w-full rounded border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]" placeholder="Street, city, state, zip" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Canonical phone *</label>
                <input type="text" name="canonical_phone" required defaultValue={initialProfile?.canonical_phone} className="w-full rounded border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]" placeholder="(555) 123-4567" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Canonical website</label>
                <input type="url" name="canonical_website" defaultValue={initialProfile?.canonical_website ?? ''} className="w-full rounded border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]" placeholder="https://..." />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsOpen(false)} className="rounded border border-[var(--card-border)] px-4 py-2 text-sm hover:bg-[var(--accent-muted)]">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="rounded bg-[var(--accent)] px-4 py-2 text-sm text-white disabled:opacity-50">
                  {isSubmitting ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
