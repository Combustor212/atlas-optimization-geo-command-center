'use client'

import { useState } from 'react'
import { TrendingUp } from 'lucide-react'

interface AutoTrackRankingButtonProps {
  locationId: string
  locationName: string
}

export function AutoTrackRankingButton({
  locationId,
  locationName,
}: AutoTrackRankingButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ rank?: number; keyword?: string; place_id?: string } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)

    const form = e.currentTarget
    const formData = new FormData(form)
    const keyword = formData.get('keyword') as string

    try {
      const response = await fetch('/api/geo/track-ranking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          keyword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.debug) {
          setError(
            `${data.error}\n\nLocation data:\nAddress: ${data.debug.address || 'none'}\nCity: ${data.debug.city || 'none'}\nState: ${data.debug.state || 'none'}\nZIP: ${data.debug.zip || 'none'}`
          )
        } else {
          setError(data.error || 'Failed to track ranking')
        }
        setLoading(false)
        return
      }

      setResult(data.data)
      setLoading(false)
      
      // Auto-close after 3 seconds on success
      setTimeout(() => {
        setOpen(false)
        setResult(null)
        form.reset()
      }, 3000)
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-[var(--accent)] px-3 py-1.5 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
        title="Auto-track ranking using Google Places API"
      >
        <TrendingUp className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
            <h3 className="text-lg font-semibold">Auto-Track Ranking</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {locationName}
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {error && (
                <div className="rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 p-3">
                  <p className="text-sm text-[var(--danger)]">{error}</p>
                </div>
              )}

              {result && (
                <div className="rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/20 p-3">
                  <p className="text-sm font-medium text-[var(--success)]">
                    ✓ Ranking tracked successfully!
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Keyword: <span className="font-medium">{result.keyword}</span>
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    Rank: <span className="font-medium">
                      {result.rank ? `#${result.rank}` : 'Not in top 20'}
                    </span>
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--muted)]">
                  Keyword to Track
                </label>
                <input
                  name="keyword"
                  type="text"
                  required
                  placeholder="e.g., plumber, restaurant"
                  disabled={loading || !!result}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-[var(--muted)]">
                  This will search Google Places API for this keyword near the location
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    setError('')
                    setResult(null)
                  }}
                  disabled={loading}
                  className="flex-1 rounded-lg border border-[var(--card-border)] py-2 disabled:opacity-50"
                >
                  {result ? 'Close' : 'Cancel'}
                </button>
                {!result && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-lg bg-[var(--accent)] py-2 text-white disabled:opacity-50"
                  >
                    {loading ? 'Tracking...' : 'Track Ranking'}
                  </button>
                )}
              </div>
            </form>

            <div className="mt-4 rounded-lg bg-[var(--accent-muted)]/20 p-3">
              <p className="text-xs text-[var(--muted)]">
                <strong>Note:</strong> This uses Google Places API to find your business
                ranking for the specified keyword. The ranking represents local pack
                position within a 5km radius of your location.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
