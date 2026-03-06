'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface AddAIVisibilityFormProps {
  locationId: string
}

export function AddAIVisibilityForm({ locationId }: AddAIVisibilityFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      location_id: locationId,
      platform: formData.get('platform'),
      query_type: formData.get('query_type'),
      search_query: formData.get('search_query'),
      is_mentioned: formData.get('is_mentioned') === 'true',
      mention_position: formData.get('mention_position') ? parseInt(formData.get('mention_position') as string) : null,
      mention_context: formData.get('mention_context') || null,
      sentiment: formData.get('sentiment'),
      snippet: formData.get('snippet') || null,
      visibility_score: parseFloat(formData.get('visibility_score') as string),
      relevance_score: parseFloat(formData.get('relevance_score') as string),
      prominence_score: parseFloat(formData.get('prominence_score') as string),
      source: 'manual',
      notes: formData.get('notes') || null,
    }

    const response = await fetch('/api/visibility/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      setIsOpen(false)
      window.location.reload()
    } else {
      alert('Failed to add AI visibility metric')
    }

    setIsSubmitting(false)
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent)]/90"
      >
        <Plus className="h-4 w-4" />
        Add AI Visibility
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-[var(--card)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Add AI Visibility Metric</h2>
              <button onClick={() => setIsOpen(false)} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">AI Platform *</label>
                  <select name="platform" required className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2">
                    <option value="chatgpt">ChatGPT</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="perplexity">Perplexity</option>
                    <option value="claude">Claude</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Query Type *</label>
                  <select name="query_type" required className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2">
                    <option value="business_search">Business Search</option>
                    <option value="recommendation">Recommendation</option>
                    <option value="comparison">Comparison</option>
                    <option value="informational">Informational</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Search Query *</label>
                <input
                  type="text"
                  name="search_query"
                  required
                  placeholder="e.g., best plumber near me"
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Was Business Mentioned? *</label>
                  <select name="is_mentioned" required className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2">
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Mention Position</label>
                  <input
                    type="number"
                    name="mention_position"
                    min="1"
                    placeholder="1, 2, 3..."
                    className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Mention Context</label>
                  <select name="mention_context" className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2">
                    <option value="">Not mentioned</option>
                    <option value="primary_recommendation">Primary Recommendation</option>
                    <option value="list">In List</option>
                    <option value="comparison">In Comparison</option>
                    <option value="passing_mention">Passing Mention</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Sentiment</label>
                  <select name="sentiment" className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2">
                    <option value="neutral">Neutral</option>
                    <option value="positive">Positive</option>
                    <option value="negative">Negative</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">AI Response Snippet</label>
                <textarea
                  name="snippet"
                  rows={3}
                  placeholder="Copy/paste the relevant snippet from the AI response..."
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Visibility Score (0-100) *</label>
                  <input
                    type="number"
                    name="visibility_score"
                    required
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="85"
                    className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Relevance Score (0-100) *</label>
                  <input
                    type="number"
                    name="relevance_score"
                    required
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="90"
                    className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Prominence Score (0-100) *</label>
                  <input
                    type="number"
                    name="prominence_score"
                    required
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="75"
                    className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Additional context or observations..."
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
                  {isSubmitting ? 'Adding...' : 'Add Metric'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
