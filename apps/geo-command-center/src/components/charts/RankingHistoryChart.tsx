'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface RankingHistoryChartProps {
  data: Array<{
    date: string
    mapRank: number | null
    organicRank: number | null
  }>
}

export function RankingHistoryChart({ data }: RankingHistoryChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-[var(--muted)]">
        No ranking history available
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
            reversed
            domain={[1, 20]}
            stroke="var(--muted)"
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
            label={{ value: 'Rank', angle: -90, position: 'insideLeft', fill: 'var(--muted)' }}
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
            dataKey="mapRank"
            stroke="var(--accent)"
            strokeWidth={2}
            name="Map Pack"
            dot={{ fill: 'var(--accent)', r: 4 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="organicRank"
            stroke="var(--success)"
            strokeWidth={2}
            name="Organic"
            dot={{ fill: 'var(--success)', r: 4 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
