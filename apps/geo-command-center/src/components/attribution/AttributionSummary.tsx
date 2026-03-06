'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Phone, TrendingUp } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

const CHANNEL_COLORS: Record<string, string> = {
  maps: 'var(--accent)',
  organic: 'var(--success)',
  ai: '#8b5cf6',
  direct: 'var(--muted)',
  paid: '#f59e0b',
  referral: '#ec4899',
}

interface AttributionSummaryProps {
  locationId: string
  locationName?: string
  range?: string
  isAdmin?: boolean
}

interface ByChannel {
  channel: string
  count: number
  value: number
}

interface TimePoint {
  date: string
  channel: string
  count: number
  value: number
}

interface Summary {
  byChannel: ByChannel[]
  timeSeries: TimePoint[]
  totalLeads: number
  totalValue: number
}

export function AttributionSummary({
  locationId,
  locationName,
  range = '30d',
}: AttributionSummaryProps) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchSummary() {
      try {
        const res = await fetch(
          `/api/locations/${locationId}/attribution/summary?range=${encodeURIComponent(range)}`
        )
        if (!res.ok) {
          setError(res.status === 403 ? 'Access denied' : 'Failed to load')
          return
        }
        const data = await res.json()
        if (!cancelled) setSummary(data)
      } catch {
        if (!cancelled) setError('Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchSummary()
    return () => {
      cancelled = true
    }
  }, [locationId, range])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Lead attribution
          </CardTitle>
        </CardHeader>
        <div className="flex h-[200px] items-center justify-center text-[var(--muted)]">
          Loading…
        </div>
      </Card>
    )
  }

  if (error || !summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Lead attribution
          </CardTitle>
        </CardHeader>
        <div className="flex h-[200px] items-center justify-center text-[var(--muted)]">
          {error ?? 'No data'}
        </div>
      </Card>
    )
  }

  const hasData = summary.totalLeads > 0 || summary.byChannel.some((c) => c.count > 0)
  const pieData = summary.byChannel.filter((c) => c.count > 0).map((c) => ({ name: c.channel, value: c.count }))
  const barData = summary.byChannel.filter((c) => c.count > 0)

  const trendByDate = new Map<string, number>()
  for (const t of summary.timeSeries) {
    const cur = trendByDate.get(t.date) ?? 0
    trendByDate.set(t.date, cur + t.count)
  }
  const trendData = Array.from(trendByDate.entries())
    .map(([date, count]) => ({ date, leads: count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Lead attribution
                {locationName && (
                  <span className="text-sm font-normal text-[var(--muted)]"> — {locationName}</span>
                )}
              </CardTitle>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Leads by channel (last {range})
              </p>
            </div>
          </div>
        </CardHeader>
        {!hasData ? (
          <div className="py-12 text-center text-[var(--muted)]">
            No lead events yet. Leads will be attributed to channels (maps, organic, AI, direct, paid, referral) when tracked.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[var(--accent)]" />
                <span className="text-sm text-[var(--muted)]">Total leads</span>
                <span className="font-semibold">{formatNumber(summary.totalLeads)}</span>
              </div>
              {summary.totalValue > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--muted)]">Attributed value</span>
                  <span className="font-semibold">{formatNumber(summary.totalValue)}</span>
                </div>
              )}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {pieData.length > 0 && (
                <div className="h-[280px] w-full">
                  <p className="mb-2 text-sm font-medium text-[var(--muted)]">By channel</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={CHANNEL_COLORS[entry.name] ?? 'var(--muted)'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '8px',
                          color: 'var(--foreground)',
                        }}
                        formatter={(value: number | undefined) => [value ?? 0, 'Leads']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {barData.length > 0 && (
                <div className="h-[280px] w-full">
                  <p className="mb-2 text-sm font-medium text-[var(--muted)]">Count by channel</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                      <XAxis
                        dataKey="channel"
                        stroke="var(--muted)"
                        tick={{ fill: 'var(--muted)', fontSize: 12 }}
                      />
                      <YAxis stroke="var(--muted)" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '8px',
                          color: 'var(--foreground)',
                        }}
                      />
                      <Bar
                        dataKey="count"
                        name="Leads"
                        fill="var(--accent)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            {trendData.length > 0 && (
              <div className="h-[260px] w-full">
                <p className="mb-2 text-sm font-medium text-[var(--muted)]">Trend (last {range})</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                    <XAxis
                      dataKey="date"
                      stroke="var(--muted)"
                      tick={{ fill: 'var(--muted)', fontSize: 11 }}
                    />
                    <YAxis stroke="var(--muted)" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '8px',
                        color: 'var(--foreground)',
                      }}
                    />
                    <Bar dataKey="leads" name="Leads" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
