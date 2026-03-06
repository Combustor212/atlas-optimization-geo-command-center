'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface TrafficChartProps {
  data: Array<{
    date: string
    clicks: number
    impressions: number
  }>
}

export function TrafficChart({ data }: TrafficChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-[var(--muted)]">
        No traffic data available
      </div>
    )
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
          <XAxis
            dataKey="date"
            stroke="var(--muted)"
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
          />
          <YAxis
            stroke="var(--muted)"
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              color: 'var(--foreground)',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="clicks"
            stroke="var(--accent)"
            strokeWidth={2}
            name="Clicks"
            dot={{ fill: 'var(--accent)', r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="impressions"
            stroke="var(--success)"
            strokeWidth={2}
            name="Impressions"
            dot={{ fill: 'var(--success)', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
