'use client'

import { useState } from 'react'
import { addReview } from '../rankings/actions'

export function AddReviewForm({ locationId }: { locationId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    count: '',
    avgRating: '',
    date: new Date().toISOString().split('T')[0],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await addReview({
        locationId,
        count: Number(formData.count),
        avgRating: Number(formData.avgRating),
        date: formData.date,
      })
      setFormData({
        count: '',
        avgRating: '',
        date: new Date().toISOString().split('T')[0],
      })
      setIsOpen(false)
      window.location.reload()
    } catch (error) {
      console.error('Failed to add review:', error)
      alert('Failed to add review')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent)]/90"
      >
        + Add Reviews
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-[var(--card)] p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-bold text-[var(--foreground)]">Add Review Data</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Total Review Count *
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.count}
              onChange={(e) => setFormData({ ...formData, count: e.target.value })}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Average Rating *
            </label>
            <input
              type="number"
              required
              min="0"
              max="5"
              step="0.1"
              value={formData.avgRating}
              onChange={(e) => setFormData({ ...formData, avgRating: e.target.value })}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)]"
              placeholder="e.g., 4.5"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Date *
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card-border)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent)]/90 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
