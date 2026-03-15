'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { Calendar } from 'lucide-react'

interface RevenueChartProps {
  initialData: { date: string; revenue: number }[]
}

type DateRange = 'month' | '3months' | '6months' | '1year' | 'custom'

export function RevenueChart({ initialData }: RevenueChartProps) {
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showCustomPicker, setShowCustomPicker] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchData = async (startDate?: string, endDate?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      
      const response = await fetch(`/api/metrics/revenue?${params.toString()}`)
      if (response.ok) {
        const newData = await response.json()
        setData(newData)
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range)
    setShowCustomPicker(range === 'custom')
    
    if (range === 'custom') return
    
    const now = new Date()
    let startDate: Date
    
    switch (range) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
        break
      case '6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
        break
      case '1year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }
    
    fetchData(
      startDate.toISOString().split('T')[0],
      now.toISOString().split('T')[0]
    )
  }

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      fetchData(customStartDate, customEndDate)
    }
  }

  const formatXAxis = (dateStr: string) => {
    const date = new Date(dateStr)
    if (dateRange === 'month') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else if (dateRange === '3months' || dateRange === '6months') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    }
  }

  const formatTooltipDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  // Calculate tick interval based on data length
  const getTickInterval = () => {
    if (data.length <= 31) return 2 // Show every 2nd day for month view
    if (data.length <= 90) return 7 // Show weekly for 3 months
    if (data.length <= 180) return 14 // Show bi-weekly for 6 months
    return 30 // Show monthly for year view
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => handleDateRangeChange('month')}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            dateRange === 'month'
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--card-border)] text-[var(--muted)] hover:bg-[var(--accent-muted)]'
          }`}
          disabled={loading}
        >
          This Month
        </button>
        <button
          onClick={() => handleDateRangeChange('3months')}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            dateRange === '3months'
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--card-border)] text-[var(--muted)] hover:bg-[var(--accent-muted)]'
          }`}
          disabled={loading}
        >
          3 Months
        </button>
        <button
          onClick={() => handleDateRangeChange('6months')}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            dateRange === '6months'
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--card-border)] text-[var(--muted)] hover:bg-[var(--accent-muted)]'
          }`}
          disabled={loading}
        >
          6 Months
        </button>
        <button
          onClick={() => handleDateRangeChange('1year')}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            dateRange === '1year'
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--card-border)] text-[var(--muted)] hover:bg-[var(--accent-muted)]'
          }`}
          disabled={loading}
        >
          1 Year
        </button>
        <button
          onClick={() => handleDateRangeChange('custom')}
          className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-1 ${
            dateRange === 'custom'
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--card-border)] text-[var(--muted)] hover:bg-[var(--accent-muted)]'
          }`}
          disabled={loading}
        >
          <Calendar className="h-4 w-4" />
          Custom
        </button>
      </div>

      {showCustomPicker && (
        <div className="mb-4 flex flex-wrap items-center gap-3 p-3 bg-[var(--card-border)] rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--muted)]">From:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2 py-1 text-sm rounded border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--muted)]">To:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2 py-1 text-sm rounded border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)]"
            />
          </div>
          <button
            onClick={handleCustomDateApply}
            disabled={!customStartDate || !customEndDate || loading}
            className="px-3 py-1 text-sm rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </div>
      )}

      <div className="h-64 relative">
        {!mounted && (
          <div className="flex h-full items-center justify-center text-[var(--muted)]">
            Loading chart...
          </div>
        )}
        {loading && mounted && (
          <div className="absolute inset-0 bg-[var(--card)]/50 flex items-center justify-center z-10">
            <div className="text-[var(--muted)]">Loading...</div>
          </div>
        )}
        {mounted && (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis 
              dataKey="date" 
              stroke="#64748b" 
              fontSize={12}
              tickFormatter={formatXAxis}
              interval={getTickInterval()}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
              }}
              labelFormatter={(label) => formatTooltipDate(String(label ?? ''))}
              formatter={(value) => [formatCurrency(Number(value) || 0), 'Revenue']}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#22c55e"
              strokeWidth={2}
              dot={data.length <= 31}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
