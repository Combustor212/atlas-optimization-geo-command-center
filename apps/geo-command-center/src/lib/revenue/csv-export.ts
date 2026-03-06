/**
 * CSV Export Utility for Revenue Impact Data
 */

import type { RevenueImpactSummary, Client } from '@/types/database'

/**
 * Convert revenue impact data to CSV format
 */
export function exportRevenueImpactToCSV(
  client: Client,
  summary: RevenueImpactSummary
): string {
  const rows: string[] = []

  // Header
  rows.push('Revenue Growth Impact Report')
  rows.push(`Client: ${client.name}`)
  rows.push(`Business: ${client.business_name || 'N/A'}`)
  rows.push(`Service Start Date: ${client.service_start_date || 'N/A'}`)
  rows.push(`Report Generated: ${new Date().toLocaleDateString()}`)
  rows.push('')

  // Summary metrics
  rows.push('Summary Metrics')
  rows.push('Metric,Value')
  rows.push(`Baseline Monthly Revenue,${formatCurrency(summary.baseline_monthly_revenue)}`)
  rows.push(`Current Month Revenue,${formatCurrency(summary.current_month_revenue)}`)
  rows.push(
    `Total Incremental Revenue,${formatCurrency(summary.total_incremental_revenue)}`
  )
  rows.push(
    `Attributed Incremental Revenue,${formatCurrency(summary.attributed_incremental_revenue)}`
  )
  rows.push(`Estimated Incremental Profit,${formatCurrency(summary.incremental_profit)}`)
  rows.push(`Revenue Growth %,${summary.revenue_growth_pct.toFixed(2)}%`)
  rows.push(`Average Monthly Lift,${formatCurrency(summary.avg_monthly_lift)}`)
  rows.push(`Trailing 3-Month Average,${formatCurrency(summary.trailing3_after_avg)}`)
  rows.push(`Trailing 3-Month Lift,${formatCurrency(summary.trailing3_lift)}`)
  rows.push(`Months Included,${summary.months_included}`)
  rows.push('')

  // Configuration
  rows.push('Configuration')
  rows.push('Setting,Value')
  rows.push(`Baseline Method,${client.baseline_method}`)
  if (client.baseline_method === 'MANUAL') {
    rows.push(
      `Manual Baseline,${formatCurrency(client.baseline_revenue_manual || 0)}`
    )
  }
  rows.push(`Gross Margin,${(client.gross_margin_pct * 100).toFixed(1)}%`)
  rows.push(`Attribution %,${(client.attribution_pct * 100).toFixed(1)}%`)
  rows.push(
    `Exclude Partial First Month,${client.exclude_partial_first_month ? 'Yes' : 'No'}`
  )
  rows.push(
    `Count Only Positive Lift,${client.count_only_positive_lift ? 'Yes' : 'No'}`
  )
  rows.push(
    `Treat Missing Month as Zero,${client.treat_missing_month_as_zero ? 'Yes' : 'No'}`
  )
  rows.push('')

  // Monthly breakdown
  rows.push('Monthly Breakdown')
  rows.push(
    'Month,Revenue,Baseline,Delta ($),Delta (%),Attributed Delta,Profit Delta'
  )

  summary.months.forEach((month) => {
    rows.push(
      [
        formatMonthDisplay(month.month),
        formatCurrency(month.revenue),
        formatCurrency(month.baseline),
        formatCurrency(month.delta),
        `${month.delta_pct.toFixed(2)}%`,
        formatCurrency(month.attributed_delta),
        formatCurrency(month.profit_delta),
      ].join(',')
    )
  })

  return rows.join('\n')
}

/**
 * Download CSV file in the browser
 */
export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

/**
 * Format currency for CSV (remove commas to avoid CSV issues)
 */
function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`
}

/**
 * Format month for display (e.g., "2024-01-01" -> "Jan 2024")
 */
function formatMonthDisplay(monthStr: string): string {
  const date = new Date(monthStr)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/**
 * Generate a filename for the CSV export
 */
export function generateCSVFilename(clientName: string): string {
  const date = new Date().toISOString().slice(0, 10)
  const sanitizedName = clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  return `revenue_impact_${sanitizedName}_${date}.csv`
}
