'use client'

import { useState } from 'react'
import { createLocationAction } from '@/app/(dashboard)/dashboard/clients/actions'

interface AddLocationFormProps {
  clientId: string
}

export function AddLocationForm({ clientId }: AddLocationFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [zipLoading, setZipLoading] = useState(false)

  async function handleZipChange(zip: string) {
    if (zip.length === 5) {
      setZipLoading(true)
      try {
        const response = await fetch(`https://api.zippopotam.us/us/${zip}`)
        if (response.ok) {
          const data = await response.json()
          const cityInput = document.querySelector('input[name="city"]') as HTMLInputElement
          const stateInput = document.querySelector('input[name="state"]') as HTMLInputElement
          
          if (cityInput && stateInput && data.places?.[0]) {
            cityInput.value = data.places[0]['place name']
            stateInput.value = data.places[0]['state abbreviation']
          }
        }
      } catch (err) {
        console.error('Failed to fetch zip data:', err)
      } finally {
        setZipLoading(false)
      }
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('client_id', clientId)
    const result = await createLocationAction(formData)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setOpen(false)
    form.reset()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-muted)]"
      >
        Add Location
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
            <h3 className="text-lg font-semibold">Add Location</h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {error && (
                <p className="text-sm text-[var(--danger)]">{error}</p>
              )}
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Name</label>
                <input
                  name="name"
                  required
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Address</label>
                <input name="address" className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">
                  ZIP Code {zipLoading && <span className="text-xs">(loading...)</span>}
                </label>
                <input 
                  name="zip" 
                  type="text"
                  maxLength={5}
                  placeholder="Enter ZIP to auto-fill city/state"
                  onChange={(e) => handleZipChange(e.target.value)}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2" 
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-sm text-[var(--muted)]">City</label>
                  <input name="city" className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--muted)]">State</label>
                  <input name="state" className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Avg Repair Ticket ($)</label>
                <input name="avg_repair_ticket" type="number" defaultValue={150} className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Avg Daily Jobs</label>
                <input name="avg_daily_jobs" type="number" defaultValue={5} className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Conversion Rate (%)</label>
                <input name="conversion_rate" type="number" defaultValue={20} className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2" />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg border border-[var(--card-border)] py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-[var(--accent)] py-2 text-white disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
