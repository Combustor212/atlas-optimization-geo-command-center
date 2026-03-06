'use client'

import type { RevenueImpactSummary, Client } from '@/types/database'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { TrendingUp, DollarSign, TrendingDown, Download } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { exportRevenueImpactToCSV, downloadCSV, generateCSVFilename } from '@/lib/revenue/csv-export'

interface RevenueImpactSummaryProps {
  client: Client
  summary: RevenueImpactSummary
}

export function RevenueImpactSummaryCards({ client, summary }: RevenueImpactSummaryProps) {
  const handleExportCSV = () => {
    const csv = exportRevenueImpactToCSV(client, summary)
    const filename = generateCSVFilename(client.name)
    downloadCSV(filename, csv)
  }

  const cards = [
    {
      title: 'Baseline Monthly Revenue',
      value: formatCurrency(summary.baseline_monthly_revenue),
      icon: DollarSign,
      color: 'var(--muted)',
      description: 'Pre-service average',
    },
    {
      title: 'Current Month Revenue',
      value: formatCurrency(summary.current_month_revenue),
      icon: DollarSign,
      color: 'var(--foreground)',
      description: 'Latest month',
    },
    {
      title: 'Total Incremental Revenue',
      value: formatCurrency(summary.total_incremental_revenue),
      icon: TrendingUp,
      color: 'var(--success)',
      description: `Since service start`,
      highlight: true,
    },
    {
      title: 'Revenue Growth',
      value: `${summary.revenue_growth_pct >= 0 ? '+' : ''}${summary.revenue_growth_pct.toFixed(1)}%`,
      icon: summary.revenue_growth_pct >= 0 ? TrendingUp : TrendingDown,
      color: summary.revenue_growth_pct >= 0 ? 'var(--success)' : 'var(--destructive)',
      description: 'vs. baseline',
    },
    {
      title: 'Average Monthly Lift',
      value: formatCurrency(summary.avg_monthly_lift),
      icon: TrendingUp,
      color: 'var(--accent)',
      description: 'Per month average',
    },
    {
      title: 'Attributed Incremental Revenue',
      value: formatCurrency(summary.attributed_incremental_revenue),
      icon: TrendingUp,
      color: 'var(--success)',
      description: `${(client.attribution_pct * 100).toFixed(0)}% attribution`,
    },
    {
      title: 'Estimated Incremental Profit',
      value: formatCurrency(summary.incremental_profit),
      icon: DollarSign,
      color: 'var(--success)',
      description: `${(client.gross_margin_pct * 100).toFixed(0)}% margin`,
      highlight: true,
    },
    {
      title: 'Trailing 3-Month Average',
      value: formatCurrency(summary.trailing3_after_avg),
      icon: TrendingUp,
      color: 'var(--accent)',
      description: `Lift: ${formatCurrency(summary.trailing3_lift)}`,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[var(--foreground)]">Impact Summary</h2>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white hover:opacity-90 transition-opacity"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Card
              key={card.title}
              className={`transition-all ${
                card.highlight
                  ? 'border-[var(--success)]/40 bg-gradient-to-br from-[var(--success-muted)]/10 to-[var(--success-muted)]/5'
                  : ''
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[var(--muted)]">{card.title}</p>
                  <Icon className="h-4 w-4" style={{ color: card.color }} />
                </div>
                <p className="text-2xl font-bold" style={{ color: card.color }}>
                  {card.value}
                </p>
                <p className="text-xs text-[var(--muted)]">{card.description}</p>
              </div>
            </Card>
          )
        })}
      </div>

      {summary.months_included === 0 && (
        <Card className="border-[var(--warning)]/40 bg-[var(--warning-muted)]/10">
          <div className="flex items-center gap-3">
            <div className="text-[var(--warning)]">⚠️</div>
            <div>
              <p className="font-medium text-[var(--foreground)]">No data available</p>
              <p className="text-sm text-[var(--muted)]">
                Add monthly revenue entries to see impact calculations
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export function RevenueBreakdownTable({ summary }: { summary: RevenueImpactSummary }) {
  const formatMonthDisplay = (monthStr: string) => {
    const date = new Date(monthStr)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Breakdown</CardTitle>
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--card-border)]">
              <th className="py-3 px-4 text-left text-sm font-medium text-[var(--muted)]">
                Month
              </th>
              <th className="py-3 px-4 text-right text-sm font-medium text-[var(--muted)]">
                Revenue
              </th>
              <th className="py-3 px-4 text-right text-sm font-medium text-[var(--muted)]">
                Baseline
              </th>
              <th className="py-3 px-4 text-right text-sm font-medium text-[var(--muted)]">
                Delta ($)
              </th>
              <th className="py-3 px-4 text-right text-sm font-medium text-[var(--muted)]">
                Delta (%)
              </th>
              <th className="py-3 px-4 text-right text-sm font-medium text-[var(--muted)]">
                Attributed
              </th>
              <th className="py-3 px-4 text-right text-sm font-medium text-[var(--muted)]">
                Profit
              </th>
            </tr>
          </thead>
          <tbody>
            {summary.months.map((month) => {
              const isPositive = month.delta >= 0
              return (
                <tr
                  key={month.month}
                  className="border-b border-[var(--card-border)] hover:bg-[var(--card-muted)] transition-colors"
                >
                  <td className="py-3 px-4 text-sm text-[var(--foreground)] whitespace-nowrap">
                    {formatMonthDisplay(month.month)}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-[var(--foreground)] font-medium">
                    {formatCurrency(month.revenue)}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-[var(--muted)]">
                    {formatCurrency(month.baseline)}
                  </td>
                  <td
                    className="py-3 px-4 text-sm text-right font-medium"
                    style={{
                      color: isPositive ? 'var(--success)' : 'var(--destructive)',
                    }}
                  >
                    {isPositive ? '+' : ''}
                    {formatCurrency(month.delta)}
                  </td>
                  <td
                    className="py-3 px-4 text-sm text-right"
                    style={{
                      color: isPositive ? 'var(--success)' : 'var(--destructive)',
                    }}
                  >
                    {isPositive ? '+' : ''}
                    {month.delta_pct.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-[var(--foreground)]">
                    {formatCurrency(month.attributed_delta)}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-[var(--success)] font-medium">
                    {formatCurrency(month.profit_delta)}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="border-t-2 border-[var(--card-border)] bg-[var(--card-muted)]">
            <tr>
              <td className="py-3 px-4 text-sm font-bold text-[var(--foreground)]">
                Total
              </td>
              <td className="py-3 px-4 text-sm text-right font-bold text-[var(--foreground)]">
                {formatCurrency(
                  summary.months.reduce((sum, m) => sum + m.revenue, 0)
                )}
              </td>
              <td className="py-3 px-4 text-sm text-right text-[var(--muted)]">
                {formatCurrency(summary.baseline_monthly_revenue * summary.months_included)}
              </td>
              <td className="py-3 px-4 text-sm text-right font-bold text-[var(--success)]">
                +{formatCurrency(summary.total_incremental_revenue)}
              </td>
              <td className="py-3 px-4"></td>
              <td className="py-3 px-4 text-sm text-right font-bold text-[var(--foreground)]">
                {formatCurrency(summary.attributed_incremental_revenue)}
              </td>
              <td className="py-3 px-4 text-sm text-right font-bold text-[var(--success)]">
                {formatCurrency(summary.incremental_profit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {summary.months.length === 0 && (
        <div className="py-8 text-center text-[var(--muted)]">
          No monthly data available yet
        </div>
      )}
    </Card>
  )
}
