'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Brain, ListTodo, Plus, Trash2, Send } from 'lucide-react'
import type { AIQuery, AIQueryRun } from '@/lib/data/ai-mentions'

interface LocationOption {
  id: string
  name: string
  client_id: string
}

interface AIMentionsClientProps {
  initialQueries: (AIQuery & { location_name?: string })[]
  initialQueue: AIQueryRun[]
  locationOptions: LocationOption[]
}

export function AIMentionsClient({
  initialQueries,
  initialQueue,
  locationOptions,
}: AIMentionsClientProps) {
  const router = useRouter()
  const [queries, setQueries] = useState(initialQueries)
  const [queue, setQueue] = useState(initialQueue)
  const [addOpen, setAddOpen] = useState(false)
  const [submitRunId, setSubmitRunId] = useState<string | null>(null)
  const [rawText, setRawText] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const platformOptions = [
    { value: 'chatgpt', label: 'ChatGPT' },
    { value: 'gemini', label: 'Gemini' },
    { value: 'perplexity', label: 'Perplexity' },
    { value: 'claude', label: 'Claude' },
  ]

  async function handleAddQuery(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = e.currentTarget
    const formData = new FormData(form)
    const res = await fetch('/api/ai/queries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query_text: formData.get('query_text'),
        location_id: formData.get('location_id'),
        platform: formData.get('platform'),
        frequency: formData.get('frequency'),
      }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data?.error ?? 'Failed to add query')
      return
    }
    const { query } = await res.json()
    setQueries((prev) => [query, ...prev])
    setAddOpen(false)
    form.reset()
    router.refresh()
  }

  async function handleDeleteQuery(id: string) {
    if (!confirm('Delete this query?')) return
    const res = await fetch(`/api/ai/queries/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setQueries((prev) => prev.filter((q) => q.id !== id))
    router.refresh()
  }

  async function handleSubmitRun(runId: string) {
    const text = rawText[runId]?.trim()
    if (!text) {
      setError('Paste the AI response text first.')
      return
    }
    setError('')
    setSubmitRunId(runId)
    const res = await fetch(`/api/ai/runs/${runId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_text: text }),
    })
    setSubmitRunId(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data?.error ?? 'Submit failed')
      return
    }
    setQueue((prev) => prev.filter((r) => r.id !== runId))
    setRawText((prev) => ({ ...prev, [runId]: '' }))
    router.refresh()
  }

  return (
    <div className="space-y-8">
      {/* Saved Queries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Queries
          </CardTitle>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            <Plus className="h-4 w-4" />
            Add query
          </button>
        </CardHeader>
        {addOpen && (
          <form onSubmit={handleAddQuery} className="mb-6 rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-4">
            {error && <p className="mb-2 text-sm text-[var(--danger)]">{error}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm text-[var(--muted)]">Query text</label>
                <textarea
                  name="query_text"
                  required
                  rows={2}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                  placeholder="e.g. Best HVAC repair near Austin TX"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Location</label>
                <select
                  name="location_id"
                  required
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                >
                  <option value="">Select location</option>
                  {locationOptions.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Platform</label>
                <select
                  name="platform"
                  required
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                >
                  {platformOptions.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Frequency</label>
                <select
                  name="frequency"
                  required
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                Save query
              </button>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        {queries.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No saved queries. Add one to run on a schedule (staff pastes results when due).</p>
        ) : (
          <ul className="space-y-2">
            {queries.map((q) => (
              <li
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--card-border)] px-4 py-3"
              >
                <div>
                  <p className="font-medium text-[var(--foreground)]">{q.query_text}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {q.platform} · {q.frequency} · {q.location_name ?? q.location_id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteQuery(q.id)}
                  className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--danger-muted)]/30 hover:text-[var(--danger)]"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* AI Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            AI Queue
          </CardTitle>
          <p className="text-sm text-[var(--muted)]">
            Runs due for capture. Paste the AI response (or summary) below and submit to record mentions.
          </p>
        </CardHeader>
        {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}
        {queue.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No queued runs. New runs are added when queries are due (weekly/monthly).</p>
        ) : (
          <ul className="space-y-6">
            {queue.map((run) => {
              const q = run.ai_queries
              const loc = run.location
              const locName = loc?.name ?? (q as { location_id?: string })?.location_id ?? '—'
              const platform = (q as { platform?: string })?.platform ?? (run as { platform?: string }).platform ?? '—'
              const queryText = (q as { query_text?: string })?.query_text ?? '—'
              return (
                <li
                  key={run.id}
                  className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4"
                >
                  <div className="mb-3">
                    <p className="font-medium text-[var(--foreground)]">{queryText}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {platform} · {locName}
                    </p>
                  </div>
                  <textarea
                    value={rawText[run.id] ?? ''}
                    onChange={(e) => setRawText((prev) => ({ ...prev, [run.id]: e.target.value }))}
                    placeholder="Paste AI response or summary here..."
                    rows={5}
                    className="mb-3 w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleSubmitRun(run.id)}
                    disabled={submitRunId === run.id}
                    className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {submitRunId === run.id ? 'Submitting…' : 'Submit & extract mentions'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
