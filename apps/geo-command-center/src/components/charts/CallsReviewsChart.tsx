'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface CallsReviewsChartProps {
  data: Array<{
    date: string
    calls: number
    reviews: number
  }>
}

export function CallsReviewsChart({ data }: CallsReviewsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-[var(--muted)]">
        No calls/reviews data available
      </div>
    )
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
          <Bar dataKey="calls" fill="var(--accent)" name="Calls" radius={[4, 4, 0, 0]} />
          <Bar dataKey="reviews" fill="var(--success)" name="Reviews" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
