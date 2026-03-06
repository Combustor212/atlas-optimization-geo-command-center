'use client'

import { useState } from 'react'
import { createClientAction } from '@/app/(dashboard)/dashboard/clients/actions'

export function AddClientForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = e.currentTarget
    const formData = new FormData(form)
    const result = await createClientAction(formData)
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
        className="rounded-lg bg-[var(--accent)] px-4 py-2.5 font-medium text-white hover:bg-[var(--accent-hover)]"
      >
        Add Client
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
            <h3 className="text-lg font-semibold">Add Client</h3>
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
                <label className="mb-1 block text-sm text-[var(--muted)]">Business Name</label>
                <input
                  name="business_name"
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Phone</label>
                <input
                  name="phone"
                  type="tel"
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                />
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
