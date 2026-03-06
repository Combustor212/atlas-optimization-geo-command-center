'use client'

import { useState } from 'react'
import { addTrafficMetric } from '../rankings/actions'

export function AddTrafficMetricForm({ locationId }: { locationId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    organicClicks: '',
    impressions: '',
    date: new Date().toISOString().split('T')[0],
    source: 'gsc',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const clicks = Number(formData.organicClicks)
      const impr = Number(formData.impressions)
      const ctr = impr > 0 ? (clicks / impr) * 100 : 0

      await addTrafficMetric({
        locationId,
        organicClicks: clicks,
        impressions: impr,
        ctr,
        date: formData.date,
        source: formData.source,
      })
      setFormData({
        organicClicks: '',
        impressions: '',
        date: new Date().toISOString().split('T')[0],
        source: 'gsc',
      })
      setIsOpen(false)
      window.location.reload()
    } catch (error) {
      console.error('Failed to add traffic metric:', error)
      alert('Failed to add traffic metric')
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
        + Add Traffic Data
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-[var(--card)] p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-bold text-[var(--foreground)]">Add Traffic Metrics</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Organic Clicks *
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.organicClicks}
              onChange={(e) => setFormData({ ...formData, organicClicks: e.target.value })}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Impressions *
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.impressions}
              onChange={(e) => setFormData({ ...formData, impressions: e.target.value })}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)]"
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

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Source
            </label>
            <select
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)]"
            >
              <option value="gsc">Google Search Console</option>
              <option value="ga4">Google Analytics 4</option>
              <option value="manual">Manual Entry</option>
            </select>
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
              {loading ? 'Adding...' : 'Add Metric'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
