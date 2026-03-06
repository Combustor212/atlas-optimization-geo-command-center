'use client'

import { useState } from 'react'
import type { Client, BaselineMethod } from '@/types/database'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Settings } from 'lucide-react'

interface RevenueImpactInputsProps {
  client: Client
  onUpdate: (updates: Partial<Client>) => Promise<void>
}

export function RevenueImpactInputs({ client, onUpdate }: RevenueImpactInputsProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [localClient, setLocalClient] = useState(client)

  const handleUpdate = async (field: keyof Client, value: unknown) => {
    setLocalClient((prev) => ({ ...prev, [field]: value }))
    setIsSaving(true)
    try {
      await onUpdate({ [field]: value })
    } finally {
      setIsSaving(false)
    }
  }

  const baselineMethodOptions: { value: BaselineMethod; label: string }[] = [
    { value: 'AVG_PRE_3', label: 'Average of 3 months before start' },
    { value: 'AVG_PRE_6', label: 'Average of 6 months before start' },
    { value: 'SINGLE_PRE_1', label: 'Single month before start' },
    { value: 'MANUAL', label: 'Manual baseline entry' },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-[var(--accent)]" />
          <CardTitle>Revenue Impact Settings</CardTitle>
          {isSaving && (
            <span className="ml-auto text-xs text-[var(--muted)]">Saving...</span>
          )}
        </div>
      </CardHeader>

      <div className="space-y-6">
        {/* Service Start Date */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Service Start Date
            <span className="text-[var(--destructive)]">*</span>
          </label>
          <input
            type="date"
            value={localClient.service_start_date || ''}
            onChange={(e) => handleUpdate('service_start_date', e.target.value)}
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] transition-all focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            When SEO/MEO/GEO services started
          </p>
        </div>

        {/* Baseline Method */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Baseline Calculation Method
          </label>
          <select
            value={localClient.baseline_method}
            onChange={(e) =>
              handleUpdate('baseline_method', e.target.value as BaselineMethod)
            }
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] transition-all focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          >
            {baselineMethodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[var(--muted)]">
            How to calculate pre-service baseline revenue
          </p>
        </div>

        {/* Manual Baseline Input (only if MANUAL method) */}
        {localClient.baseline_method === 'MANUAL' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
              Manual Baseline Monthly Revenue ($)
              <span className="text-[var(--destructive)]">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={localClient.baseline_revenue_manual || ''}
              onChange={(e) =>
                handleUpdate('baseline_revenue_manual', parseFloat(e.target.value) || 0)
              }
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] transition-all focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              placeholder="0.00"
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              Enter the baseline monthly revenue manually
            </p>
          </div>
        )}

        {/* Gross Margin */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Gross Margin (%)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={(localClient.gross_margin_pct || 0) * 100}
              onChange={(e) =>
                handleUpdate('gross_margin_pct', parseFloat(e.target.value) / 100)
              }
              className="flex-1"
            />
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={((localClient.gross_margin_pct || 0) * 100).toFixed(1)}
              onChange={(e) =>
                handleUpdate('gross_margin_pct', parseFloat(e.target.value) / 100)
              }
              className="w-20 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] text-sm transition-all focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
            <span className="text-sm text-[var(--muted)]">%</span>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Profit margin for incremental profit calculation
          </p>
        </div>

        {/* Attribution Percentage */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Attribution to SEO/MEO/GEO (%)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={(localClient.attribution_pct || 1) * 100}
              onChange={(e) =>
                handleUpdate('attribution_pct', parseFloat(e.target.value) / 100)
              }
              className="flex-1"
            />
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={((localClient.attribution_pct || 1) * 100).toFixed(1)}
              onChange={(e) =>
                handleUpdate('attribution_pct', parseFloat(e.target.value) / 100)
              }
              className="w-20 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] text-sm transition-all focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
            <span className="text-sm text-[var(--muted)]">%</span>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            What % of revenue lift to attribute to your services
          </p>
        </div>

        {/* Toggles */}
        <div className="space-y-3 rounded-lg border border-[var(--card-border)] bg-[var(--card-muted)] p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={localClient.exclude_partial_first_month}
              onChange={(e) =>
                handleUpdate('exclude_partial_first_month', e.target.checked)
              }
              className="h-4 w-4 rounded border-[var(--card-border)] text-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            />
            <span className="text-sm text-[var(--foreground)]">
              Exclude partial first month
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={localClient.count_only_positive_lift}
              onChange={(e) =>
                handleUpdate('count_only_positive_lift', e.target.checked)
              }
              className="h-4 w-4 rounded border-[var(--card-border)] text-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            />
            <span className="text-sm text-[var(--foreground)]">
              Count only positive lift in totals
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={localClient.treat_missing_month_as_zero}
              onChange={(e) =>
                handleUpdate('treat_missing_month_as_zero', e.target.checked)
              }
              className="h-4 w-4 rounded border-[var(--card-border)] text-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            />
            <span className="text-sm text-[var(--foreground)]">
              Treat missing months as zero revenue
            </span>
          </label>
        </div>

        {/* Currency */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Currency
          </label>
          <select
            value={localClient.currency}
            onChange={(e) => handleUpdate('currency', e.target.value)}
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] transition-all focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          >
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="CAD">CAD - Canadian Dollar</option>
            <option value="AUD">AUD - Australian Dollar</option>
          </select>
        </div>
      </div>
    </Card>
  )
}
