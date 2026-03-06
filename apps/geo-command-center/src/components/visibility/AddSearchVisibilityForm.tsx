'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface AddSearchVisibilityFormProps {
  locationId: string
}

export function AddSearchVisibilityForm({ locationId }: AddSearchVisibilityFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      location_id: locationId,
      keyword: formData.get('keyword'),
      search_type: formData.get('search_type'),
      device_type: formData.get('device_type'),
      position: formData.get('position') ? parseInt(formData.get('position') as string) : null,
      is_visible: formData.get('is_visible') === 'true',
      page_number: parseInt(formData.get('page_number') as string),
      has_featured_snippet: formData.get('has_featured_snippet') === 'on',
      has_knowledge_panel: formData.get('has_knowledge_panel') === 'on',
      has_local_pack: formData.get('has_local_pack') === 'on',
      local_pack_position: formData.get('local_pack_position') ? parseInt(formData.get('local_pack_position') as string) : null,
      has_image_pack: formData.get('has_image_pack') === 'on',
      has_video_result: formData.get('has_video_result') === 'on',
      gmb_shown: formData.get('gmb_shown') === 'on',
      overall_visibility_score: parseFloat(formData.get('overall_visibility_score') as string),
      serp_dominance_score: parseFloat(formData.get('serp_dominance_score') as string),
      search_intent: formData.get('search_intent') || null,
      search_location: formData.get('search_location') || null,
      source: 'manual',
      notes: formData.get('notes') || null,
    }

    const response = await fetch('/api/visibility/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      setIsOpen(false)
      window.location.reload()
    } else {
      alert('Failed to add search visibility metric')
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
        Add Search Visibility
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-[var(--card)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Add Search Visibility Metric</h2>
              <button onClick={() => setIsOpen(false)} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Keyword *</label>
                  <input
                    type="text"
                    name="keyword"
                    required
                    placeholder="e.g., plumber chicago"
                    className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Search Type *</label>
                  <select name="search_type" required className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2">
                    <option value="local_pack">Local Pack</option>
                    <option value="organic">Organic</option>
                    <option value="featured_snippet">Featured Snippet</option>
                    <option value="people_also_ask">People Also Ask</option>
                    <option value="knowledge_panel">Knowledge Panel</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Device Type</label>
                  <select name="device_type" className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2">
                    <option value="desktop">Desktop</option>
                    <option value="mobile">Mobile</option>
                    <option value="tablet">Tablet</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Position</label>
                  <input
                    type="number"
                    name="position"
                    min="1"
                    placeholder="1-100"
                    className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Page Number</label>
                  <input
                    type="number"
                    name="page_number"
                    min="1"
                    defaultValue="1"
                    className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Is Visible? *</label>
                  <select name="is_visible" required className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2">
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Search Intent</label>
                  <select name="search_intent" className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2">
                    <option value="">Select intent</option>
                    <option value="navigational">Navigational</option>
                    <option value="informational">Informational</option>
                    <option value="transactional">Transactional</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">SERP Features</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="has_featured_snippet" className="rounded" />
                    <span className="text-sm">Featured Snippet</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="has_knowledge_panel" className="rounded" />
                    <span className="text-sm">Knowledge Panel</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="has_local_pack" className="rounded" />
                    <span className="text-sm">Local Pack</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="has_image_pack" className="rounded" />
                    <span className="text-sm">Image Pack</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="has_video_result" className="rounded" />
                    <span className="text-sm">Video Result</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="gmb_shown" className="rounded" />
                    <span className="text-sm">GMB Profile Shown</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Local Pack Position (if applicable)</label>
                <input
                  type="number"
                  name="local_pack_position"
                  min="1"
                  max="3"
                  placeholder="1, 2, or 3"
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Overall Visibility Score (0-100) *</label>
                  <input
                    type="number"
                    name="overall_visibility_score"
                    required
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="85"
                    className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">SERP Dominance Score (0-100) *</label>
                  <input
                    type="number"
                    name="serp_dominance_score"
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
                <label className="mb-1 block text-sm font-medium">Search Location</label>
                <input
                  type="text"
                  name="search_location"
                  placeholder="e.g., Chicago, IL"
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Additional observations about this search result..."
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
