'use client'

import { useState } from 'react'
import { addRanking } from './actions'

export function AddRankingForm({ locationId }: { locationId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    keyword: '',
    keywordType: 'primary',
    mapPackPosition: '',
    organicPosition: '',
    source: 'manual',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await addRanking({
        locationId,
        keyword: formData.keyword,
        keywordType: formData.keywordType,
        mapPackPosition: formData.mapPackPosition ? Number(formData.mapPackPosition) : null,
        organicPosition: formData.organicPosition ? Number(formData.organicPosition) : null,
        source: formData.source,
      })
      setFormData({
        keyword: '',
        keywordType: 'primary',
        mapPackPosition: '',
        organicPosition: '',
        source: 'manual',
      })
      setIsOpen(false)
      window.location.reload()
    } catch (error) {
      console.error('Failed to add ranking:', error)
      alert('Failed to add ranking')
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
        + Add Ranking
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-[var(--card)] p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-bold text-[var(--foreground)]">Add Ranking</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Keyword *
            </label>
            <input
              type="text"
              required
              value={formData.keyword}
              onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)]"
              placeholder="e.g., plumber near me"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Keyword Type
            </label>
            <select
              value={formData.keywordType}
              onChange={(e) => setFormData({ ...formData, keywordType: e.target.value })}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)]"
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Map Pack Position
              </label>
              <input
                type="number"
                min="1"
                value={formData.mapPackPosition}
                onChange={(e) => setFormData({ ...formData, mapPackPosition: e.target.value })}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)]"
                placeholder="1-20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Organic Position
              </label>
              <input
                type="number"
                min="1"
                value={formData.organicPosition}
                onChange={(e) => setFormData({ ...formData, organicPosition: e.target.value })}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)]"
                placeholder="1-100"
              />
            </div>
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
              {loading ? 'Adding...' : 'Add Ranking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
