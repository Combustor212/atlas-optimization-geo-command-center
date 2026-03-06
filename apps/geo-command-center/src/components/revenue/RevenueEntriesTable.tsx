'use client'

import { useState, useMemo } from 'react'
import type { ClientRevenueMonthly, RevenueSource } from '@/types/database'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, Plus, Save, Trash2 } from 'lucide-react'
import { generateMonthRange, formatMonthDisplay, isPreStartMonth } from '@/lib/revenue/client-utils'

interface RevenueEntriesTableProps {
  clientId: string
  agencyId: string
  serviceStartDate: string | null
  entries: ClientRevenueMonthly[]
  onEntriesUpdate: () => void
}

const REVENUE_SOURCES: { value: RevenueSource; label: string }[] = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'QB', label: 'QuickBooks' },
  { value: 'STRIPE', label: 'Stripe' },
  { value: 'SQUARE', label: 'Square' },
  { value: 'SHOPIFY', label: 'Shopify' },
  { value: 'OTHER', label: 'Other' },
]

export function RevenueEntriesTable({
  clientId,
  agencyId,
  serviceStartDate,
  entries,
  onEntriesUpdate,
}: RevenueEntriesTableProps) {
  const [editingRows, setEditingRows] = useState<Record<string, {
    revenue: string
    source: RevenueSource
    notes: string
  }>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showAllMonths, setShowAllMonths] = useState(false)

  // Generate month range for display (6 months before start to now)
  const monthRange = useMemo(() => {
    if (!serviceStartDate) return []
    
    const startDate = new Date(serviceStartDate)
    // Go back 6 months from start date
    const displayStart = new Date(startDate.getFullYear(), startDate.getMonth() - 6, 1)
    
    return generateMonthRange(displayStart, new Date())
  }, [serviceStartDate])

  // Create a map of existing entries for quick lookup
  const entriesMap = useMemo(() => {
    const map = new Map<string, ClientRevenueMonthly>()
    entries.forEach((entry) => {
      map.set(entry.month, entry)
    })
    return map
  }, [entries])

  // Filter to only show months with data or recent months if showAllMonths is false
  const displayMonths = useMemo(() => {
    if (showAllMonths) return monthRange

    // Show last 12 months + any months with data
    const now = new Date()
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1)

    return monthRange.filter((month) => {
      const monthDate = new Date(month)
      return monthDate >= twelveMonthsAgo || entriesMap.has(month)
    })
  }, [monthRange, showAllMonths, entriesMap])

  const startEditing = (month: string, entry?: ClientRevenueMonthly) => {
    setEditingRows((prev) => ({
      ...prev,
      [month]: {
        revenue: entry?.revenue?.toString() || '',
        source: entry?.source || 'MANUAL',
        notes: entry?.notes || '',
      },
    }))
  }

  const cancelEditing = (month: string) => {
    setEditingRows((prev) => {
      const newRows = { ...prev }
      delete newRows[month]
      return newRows
    })
  }

  const saveRow = async (month: string) => {
    const editData = editingRows[month]
    if (!editData) return

    const revenue = parseFloat(editData.revenue)
    if (isNaN(revenue) || revenue < 0) {
      alert('Please enter a valid revenue amount')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/revenue/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          agencyId,
          month,
          revenue,
          source: editData.source,
          notes: editData.notes || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save revenue entry')
      }

      cancelEditing(month)
      onEntriesUpdate()
    } catch (error) {
      console.error('Error saving revenue entry:', error)
      alert('Failed to save revenue entry')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteRow = async (month: string) => {
    if (!confirm('Are you sure you want to delete this revenue entry?')) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/revenue/delete?clientId=${clientId}&month=${month}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete revenue entry')
      }

      onEntriesUpdate()
    } catch (error) {
      console.error('Error deleting revenue entry:', error)
      alert('Failed to delete revenue entry')
    } finally {
      setIsSaving(false)
    }
  }

  const autofillMonths = () => {
    const newEditingRows: typeof editingRows = {}
    displayMonths.forEach((month) => {
      if (!entriesMap.has(month)) {
        newEditingRows[month] = {
          revenue: '',
          source: 'MANUAL',
          notes: '',
        }
      }
    })
    setEditingRows((prev) => ({ ...prev, ...newEditingRows }))
  }

  const isPreStart = (month: string) => {
    if (!serviceStartDate) return false
    return isPreStartMonth(month, serviceStartDate)
  }

  if (!serviceStartDate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Entries</CardTitle>
        </CardHeader>
        <div className="py-8 text-center text-[var(--muted)]">
          Please set a service start date first
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Table className="h-5 w-5 text-[var(--accent)]" />
            <CardTitle>Monthly Revenue Data</CardTitle>
            {isSaving && (
              <span className="ml-2 text-xs text-[var(--muted)]">Saving...</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAllMonths(!showAllMonths)}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--card-muted)] transition-colors"
            >
              {showAllMonths ? 'Show Recent' : 'Show All Months'}
            </button>
            <button
              onClick={autofillMonths}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm text-white hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              Autofill Empty Months
            </button>
          </div>
        </div>
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--card-border)]">
              <th className="py-3 px-4 text-left text-sm font-medium text-[var(--muted)]">
                Month
              </th>
              <th className="py-3 px-4 text-left text-sm font-medium text-[var(--muted)]">
                Revenue ($)
              </th>
              <th className="py-3 px-4 text-left text-sm font-medium text-[var(--muted)]">
                Source
              </th>
              <th className="py-3 px-4 text-left text-sm font-medium text-[var(--muted)]">
                Notes
              </th>
              <th className="py-3 px-4 text-right text-sm font-medium text-[var(--muted)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {displayMonths.map((month) => {
              const entry = entriesMap.get(month)
              const isEditing = !!editingRows[month]
              const editData = editingRows[month]
              const preStart = isPreStart(month)

              return (
                <tr
                  key={month}
                  className={`border-b border-[var(--card-border)] hover:bg-[var(--card-muted)] transition-colors ${
                    preStart ? 'bg-[var(--accent-muted)]/10' : ''
                  }`}
                >
                  <td className="py-3 px-4 text-sm text-[var(--foreground)] whitespace-nowrap">
                    {formatMonthDisplay(month)}
                    {preStart && (
                      <span className="ml-2 text-xs text-[var(--muted)]">(baseline)</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editData.revenue}
                        onChange={(e) =>
                          setEditingRows((prev) => ({
                            ...prev,
                            [month]: { ...prev[month], revenue: e.target.value },
                          }))
                        }
                        className="w-full rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                        placeholder="0.00"
                      />
                    ) : (
                      <span className="text-sm text-[var(--foreground)]">
                        {entry?.revenue
                          ? `$${entry.revenue.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : '-'}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {isEditing ? (
                      <select
                        value={editData.source}
                        onChange={(e) =>
                          setEditingRows((prev) => ({
                            ...prev,
                            [month]: {
                              ...prev[month],
                              source: e.target.value as RevenueSource,
                            },
                          }))
                        }
                        className="w-full rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                      >
                        {REVENUE_SOURCES.map((src) => (
                          <option key={src.value} value={src.value}>
                            {src.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-[var(--muted)]">
                        {entry?.source || '-'}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.notes}
                        onChange={(e) =>
                          setEditingRows((prev) => ({
                            ...prev,
                            [month]: { ...prev[month], notes: e.target.value },
                          }))
                        }
                        className="w-full rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                        placeholder="Optional notes"
                      />
                    ) : (
                      <span className="text-xs text-[var(--muted)] truncate max-w-[200px] block">
                        {entry?.notes || '-'}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveRow(month)}
                            disabled={isSaving}
                            className="flex items-center gap-1 rounded bg-[var(--success)] px-2 py-1 text-xs text-white hover:opacity-90 disabled:opacity-50"
                          >
                            <Save className="h-3 w-3" />
                            Save
                          </button>
                          <button
                            onClick={() => cancelEditing(month)}
                            disabled={isSaving}
                            className="rounded bg-[var(--muted)] px-2 py-1 text-xs text-[var(--foreground)] hover:opacity-90 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditing(month, entry)}
                            className="rounded bg-[var(--accent)] px-2 py-1 text-xs text-white hover:opacity-90"
                          >
                            {entry ? 'Edit' : 'Add'}
                          </button>
                          {entry && (
                            <button
                              onClick={() => deleteRow(month)}
                              disabled={isSaving}
                              className="rounded bg-[var(--destructive)]/10 p-1 text-[var(--destructive)] hover:bg-[var(--destructive)]/20 disabled:opacity-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {displayMonths.length === 0 && (
        <div className="py-8 text-center text-[var(--muted)]">
          No months available. Adjust your service start date.
        </div>
      )}
    </Card>
  )
}
