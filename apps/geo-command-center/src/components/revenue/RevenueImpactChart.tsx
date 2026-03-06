'use client'

import type { RevenueImpactSummary } from '@/types/database'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { BarChart } from 'lucide-react'

interface RevenueImpactChartProps {
  summary: RevenueImpactSummary
}

export function RevenueImpactChart({ summary }: RevenueImpactChartProps) {
  // Prepare data for the chart
  const chartData = summary.months.map((month) => {
    const date = new Date(month.month)
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    
    return {
      month: monthLabel,
      revenue: Number(month.revenue.toFixed(2)),
      baseline: Number(month.baseline.toFixed(2)),
      delta: Number(month.delta.toFixed(2)),
    }
  })

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart className="h-5 w-5 text-[var(--accent)]" />
            <CardTitle>Revenue Trend</CardTitle>
          </div>
        </CardHeader>
        <div className="py-8 text-center text-[var(--muted)]">
          No data available for chart
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart className="h-5 w-5 text-[var(--accent)]" />
          <CardTitle>Revenue Trend</CardTitle>
        </div>
      </CardHeader>

      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis
              dataKey="month"
              stroke="var(--muted)"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="var(--muted)"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) =>
                `$${(value / 1000).toFixed(0)}k`
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                color: 'var(--foreground)',
              }}
              formatter={(value: number | undefined) => [
                value !== undefined
                  ? `$${value.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : '$0.00',
              ]}
            />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '12px',
              }}
            />
            <ReferenceLine
              y={summary.baseline_monthly_revenue}
              stroke="var(--muted)"
              strokeDasharray="5 5"
              label={{
                value: 'Baseline',
                position: 'right',
                fill: 'var(--muted)',
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="var(--accent)"
              strokeWidth={3}
              dot={{ fill: 'var(--accent)', r: 4 }}
              activeDot={{ r: 6 }}
              name="Monthly Revenue"
            />
            <Line
              type="monotone"
              dataKey="baseline"
              stroke="var(--muted)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Baseline"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export function RevenueLiftChart({ summary }: RevenueImpactChartProps) {
  // Prepare data for lift visualization
  const liftData = summary.months.map((month) => {
    const date = new Date(month.month)
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    
    return {
      month: monthLabel,
      lift: Number(month.delta.toFixed(2)),
      attributedLift: Number(month.attributed_delta.toFixed(2)),
    }
  })

  if (liftData.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart className="h-5 w-5 text-[var(--success)]" />
          <CardTitle>Monthly Revenue Lift</CardTitle>
        </div>
      </CardHeader>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={liftData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis
              dataKey="month"
              stroke="var(--muted)"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="var(--muted)"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) =>
                value >= 0 ? `+$${(value / 1000).toFixed(0)}k` : `-$${(Math.abs(value) / 1000).toFixed(0)}k`
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                color: 'var(--foreground)',
              }}
              formatter={(value: number | undefined) => [
                value !== undefined && value >= 0
                  ? `+$${value.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : value !== undefined
                  ? `-$${Math.abs(value).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : '$0.00',
              ]}
            />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '12px',
              }}
            />
            <ReferenceLine y={0} stroke="var(--card-border)" />
            <Line
              type="monotone"
              dataKey="lift"
              stroke="var(--success)"
              strokeWidth={2}
              dot={{ fill: 'var(--success)', r: 3 }}
              name="Total Lift"
            />
            <Line
              type="monotone"
              dataKey="attributedLift"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={{ fill: 'var(--accent)', r: 3 }}
              name="Attributed Lift"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
