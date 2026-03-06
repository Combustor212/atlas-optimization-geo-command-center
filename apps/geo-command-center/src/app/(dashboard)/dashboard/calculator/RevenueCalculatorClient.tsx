'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Calculator, ArrowLeft, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { RevenueImpactInputs } from '@/components/revenue/RevenueImpactInputs'
import { RevenueEntriesTable } from '@/components/revenue/RevenueEntriesTable'
import { RevenueImpactSummaryCards, RevenueBreakdownTable } from '@/components/revenue/RevenueImpactSummary'
import { RevenueImpactChart, RevenueLiftChart } from '@/components/revenue/RevenueImpactChart'
import type { Client, ClientRevenueMonthly, RevenueImpactSummary } from '@/types/database'

interface RevenueCalculatorClientProps {
  clients: Client[]
  initialClientId?: string
}

export function RevenueCalculatorClient({
  clients,
  initialClientId = '',
}: RevenueCalculatorClientProps) {
  const router = useRouter()

  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [revenueEntries, setRevenueEntries] = useState<ClientRevenueMonthly[]>([])
  const [summary, setSummary] = useState<RevenueImpactSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [configErrors, setConfigErrors] = useState<string[]>([])
  const [baselineWarning, setBaselineWarning] = useState<string | null>(null)

  // Fetch client details and revenue entries when client is selected
  const fetchClientData = useCallback(async (clientId: string) => {
    if (!clientId) return

    setIsLoading(true)
    setError(null)
    setConfigErrors([])
    setBaselineWarning(null)

    try {
      // Fetch client details and calculate summary using API
      const [clientResponse, revenueResponse] = await Promise.all([
        fetch(`/api/clients/${clientId}`),
        fetch(`/api/revenue/entries?clientId=${clientId}`),
      ])

      if (!clientResponse.ok) throw new Error('Failed to fetch client')
      if (!revenueResponse.ok) throw new Error('Failed to fetch revenue entries')

      const clientData = await clientResponse.json()
      const revenueData = await revenueResponse.json()

      setSelectedClient(clientData.client)
      setRevenueEntries(revenueData.entries || [])

      // Calculate summary on client side
      const calcResponse = await fetch('/api/revenue/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: clientData.client,
          entries: revenueData.entries || [],
        }),
      })

      if (calcResponse.ok) {
        const calcData = await calcResponse.json()
        setSummary(calcData.summary)
        setConfigErrors(calcData.configErrors || [])
        setBaselineWarning(calcData.baselineWarning)
      }
    } catch (err) {
      console.error('Error fetching client data:', err)
      setError('Failed to load client data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Watch for client selection changes
  useEffect(() => {
    if (selectedClientId) {
      fetchClientData(selectedClientId)
    }
  }, [selectedClientId, fetchClientData])

  // Update client configuration
  const handleClientUpdate = async (updates: Partial<Client>) => {
    if (!selectedClient) return

    try {
      const response = await fetch('/api/revenue/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClient.id, ...updates }),
      })

      if (!response.ok) throw new Error('Failed to update client')

      // Refresh client data
      await fetchClientData(selectedClient.id)
    } catch (err) {
      console.error('Error updating client:', err)
      alert('Failed to update client configuration')
    }
  }

  // Refresh revenue entries after changes
  const handleEntriesUpdate = useCallback(() => {
    if (selectedClient) {
      fetchClientData(selectedClient.id)
    }
  }, [selectedClient, fetchClientData])

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]/10">
            <Calculator className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Revenue Growth Impact Calculator
          </h1>
        </div>
        <p className="text-[var(--muted)]">
          Measure actual revenue growth impact from your SEO/MEO/GEO services
        </p>
      </div>

      {/* Client Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Client</CardTitle>
        </CardHeader>
        <div className="flex items-center gap-4">
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="flex-1 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] transition-all focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          >
            <option value="">-- Select a client --</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} {client.business_name ? `(${client.business_name})` : ''}
              </option>
            ))}
          </select>
          {selectedClient && (
            <button
              onClick={() => router.push(`/dashboard/clients/${selectedClient.id}`)}
              className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--card-muted)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              View Client Details
            </button>
          )}
        </div>
      </Card>

      {/* Error Messages */}
      {error && (
        <Card className="mb-6 border-[var(--destructive)]/40 bg-[var(--destructive-muted)]/10">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-[var(--destructive)]" />
            <div>
              <p className="font-medium text-[var(--foreground)]">Error</p>
              <p className="text-sm text-[var(--muted)]">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Configuration Errors */}
      {configErrors.length > 0 && (
        <Card className="mb-6 border-[var(--warning)]/40 bg-[var(--warning-muted)]/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-[var(--warning)] mt-0.5" />
            <div>
              <p className="font-medium text-[var(--foreground)] mb-2">Configuration Issues</p>
              <ul className="text-sm text-[var(--muted)] space-y-1">
                {configErrors.map((err, idx) => (
                  <li key={idx}>• {err}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Baseline Warning */}
      {baselineWarning && (
        <Card className="mb-6 border-[var(--warning)]/40 bg-[var(--warning-muted)]/10">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-[var(--warning)]" />
            <div>
              <p className="font-medium text-[var(--foreground)]">Baseline Data Warning</p>
              <p className="text-sm text-[var(--muted)]">{baselineWarning}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Main Content */}
      {!selectedClient ? (
        <Card className="py-12 text-center">
          <Calculator className="mx-auto h-12 w-12 text-[var(--muted)]" />
          <p className="mt-4 text-[var(--muted)]">Select a client to view revenue impact</p>
        </Card>
      ) : isLoading ? (
        <Card className="py-12 text-center">
          <p className="text-[var(--muted)]">Loading...</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Settings */}
          <RevenueImpactInputs client={selectedClient} onUpdate={handleClientUpdate} />

          {/* Revenue Entries */}
          <RevenueEntriesTable
            clientId={selectedClient.id}
            agencyId={selectedClient.agency_id}
            serviceStartDate={selectedClient.service_start_date}
            entries={revenueEntries}
            onEntriesUpdate={handleEntriesUpdate}
          />

          {/* Impact Summary */}
          {summary && configErrors.length === 0 && (
            <>
              <RevenueImpactSummaryCards client={selectedClient} summary={summary} />

              {/* Charts */}
              <div className="grid gap-6 lg:grid-cols-2">
                <RevenueImpactChart summary={summary} />
                <RevenueLiftChart summary={summary} />
              </div>

              {/* Monthly Breakdown Table */}
              <RevenueBreakdownTable summary={summary} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
