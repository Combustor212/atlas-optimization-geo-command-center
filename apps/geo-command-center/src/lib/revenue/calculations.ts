/**
 * Revenue Impact Calculation Module
 * Pure functions for calculating revenue impact metrics
 */

import type {
  Client,
  ClientRevenueMonthly,
  RevenueImpactSummary,
  RevenueMonthBreakdown,
  BaselineMethod,
} from '@/types/database'

/**
 * Configuration for revenue impact calculations
 */
export interface RevenueCalculationConfig {
  serviceStartDate: Date
  baselineMethod: BaselineMethod
  baselineRevenueManual?: number | null
  grossMarginPct: number
  attributionPct: number
  excludePartialFirstMonth: boolean
  countOnlyPositiveLift: boolean
  treatMissingMonthAsZero: boolean
}

/**
 * Get the first day of the month for a given date
 */
export function getFirstDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/**
 * Format a date as YYYY-MM-01 string
 */
export function formatMonthKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

/**
 * Parse a month string (YYYY-MM-DD) to Date
 */
export function parseMonthKey(monthStr: string): Date {
  return new Date(monthStr)
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

/**
 * Calculate baseline monthly revenue based on the selected method
 */
export function calculateBaseline(
  config: RevenueCalculationConfig,
  revenueEntries: ClientRevenueMonthly[]
): number {
  if (config.baselineMethod === 'MANUAL') {
    return config.baselineRevenueManual ?? 0
  }

  const startMonth = getFirstDayOfMonth(config.serviceStartDate)
  
  // Get pre-start revenue entries
  const preStartEntries = revenueEntries
    .filter((entry) => {
      const entryDate = parseMonthKey(entry.month)
      return entryDate < startMonth
    })
    .sort((a, b) => {
      const aDate = parseMonthKey(a.month)
      const bDate = parseMonthKey(b.month)
      return bDate.getTime() - aDate.getTime() // Descending order
    })

  // Determine how many months to use
  let monthsToUse = 3
  if (config.baselineMethod === 'AVG_PRE_6') monthsToUse = 6
  else if (config.baselineMethod === 'SINGLE_PRE_1') monthsToUse = 1

  const relevantEntries = preStartEntries.slice(0, monthsToUse)

  if (relevantEntries.length === 0) {
    return 0
  }

  if (config.baselineMethod === 'SINGLE_PRE_1') {
    return relevantEntries[0]?.revenue ?? 0
  }

  // Calculate average
  const sum = relevantEntries.reduce((acc, entry) => acc + entry.revenue, 0)
  return sum / relevantEntries.length
}

/**
 * Check if baseline data is sufficient for the selected method
 */
export function isBaselineSufficient(
  config: RevenueCalculationConfig,
  revenueEntries: ClientRevenueMonthly[]
): { sufficient: boolean; message?: string } {
  if (config.baselineMethod === 'MANUAL') {
    if (config.baselineRevenueManual === null || config.baselineRevenueManual === undefined) {
      return { sufficient: false, message: 'Manual baseline revenue is required' }
    }
    return { sufficient: true }
  }

  const startMonth = getFirstDayOfMonth(config.serviceStartDate)
  const preStartEntries = revenueEntries.filter((entry) => {
    const entryDate = parseMonthKey(entry.month)
    return entryDate < startMonth
  })

  let required = 3
  let methodName = 'Average of 3 months'
  
  if (config.baselineMethod === 'AVG_PRE_6') {
    required = 6
    methodName = 'Average of 6 months'
  } else if (config.baselineMethod === 'SINGLE_PRE_1') {
    required = 1
    methodName = 'Single previous month'
  }

  if (preStartEntries.length < required) {
    return {
      sufficient: false,
      message: `${methodName} requires ${required} month(s) before service start. Only ${preStartEntries.length} available.`,
    }
  }

  return { sufficient: true }
}

/**
 * Get the list of months to include in calculations (after service start)
 */
export function getAfterStartMonths(
  config: RevenueCalculationConfig,
  revenueEntries: ClientRevenueMonthly[],
  currentDate: Date = new Date()
): string[] {
  const startMonth = getFirstDayOfMonth(config.serviceStartDate)
  const startDayOfMonth = config.serviceStartDate.getDate()
  
  // Determine the first month to include
  let firstIncludedMonth = startMonth
  if (config.excludePartialFirstMonth && startDayOfMonth !== 1) {
    // Exclude the start month if it's partial
    firstIncludedMonth = addMonths(startMonth, 1)
  }

  const months: string[] = []
  const revenueMap = new Map(revenueEntries.map((e) => [e.month, e]))

  // Generate all months from first included to current month
  let currentMonth = firstIncludedMonth
  const currentMonthKey = getFirstDayOfMonth(currentDate)

  while (currentMonth <= currentMonthKey) {
    const monthKey = formatMonthKey(currentMonth)
    
    // Include month if:
    // 1. It has revenue data, OR
    // 2. treat_missing_month_as_zero is true
    if (revenueMap.has(monthKey) || config.treatMissingMonthAsZero) {
      months.push(monthKey)
    }

    currentMonth = addMonths(currentMonth, 1)
  }

  return months
}

/**
 * Calculate monthly breakdown with all metrics
 */
export function calculateMonthlyBreakdown(
  baseline: number,
  config: RevenueCalculationConfig,
  revenueEntries: ClientRevenueMonthly[]
): RevenueMonthBreakdown[] {
  const months = getAfterStartMonths(config, revenueEntries)
  const revenueMap = new Map(revenueEntries.map((e) => [e.month, e]))

  return months.map((monthKey) => {
    const entry = revenueMap.get(monthKey)
    const revenue = entry?.revenue ?? 0

    const delta = revenue - baseline
    const deltaPct = baseline > 0 ? (delta / baseline) * 100 : 0
    const attributedDelta = delta * config.attributionPct
    const profitDelta = attributedDelta * config.grossMarginPct

    return {
      month: monthKey,
      revenue,
      baseline,
      delta,
      delta_pct: deltaPct,
      attributed_delta: attributedDelta,
      profit_delta: profitDelta,
    }
  })
}

/**
 * Calculate complete revenue impact summary
 */
export function calculateRevenueImpact(
  config: RevenueCalculationConfig,
  revenueEntries: ClientRevenueMonthly[]
): RevenueImpactSummary {
  // Calculate baseline
  const baseline = calculateBaseline(config, revenueEntries)

  // Calculate monthly breakdown
  const monthlyBreakdown = calculateMonthlyBreakdown(baseline, config, revenueEntries)

  // Calculate totals
  let totalIncrementalRevenue = 0
  monthlyBreakdown.forEach((month) => {
    if (config.countOnlyPositiveLift) {
      totalIncrementalRevenue += Math.max(month.delta, 0)
    } else {
      totalIncrementalRevenue += month.delta
    }
  })

  const attributedIncrementalRevenue = totalIncrementalRevenue * config.attributionPct
  const incrementalProfit = attributedIncrementalRevenue * config.grossMarginPct

  // Current month revenue (last month in breakdown)
  const currentMonthRevenue =
    monthlyBreakdown.length > 0
      ? monthlyBreakdown[monthlyBreakdown.length - 1].revenue
      : 0

  // Revenue growth percentage
  const revenueGrowthPct =
    baseline > 0 ? ((currentMonthRevenue - baseline) / baseline) * 100 : 0

  // Average monthly lift
  const avgMonthlyLift =
    monthlyBreakdown.length > 0 ? totalIncrementalRevenue / monthlyBreakdown.length : 0

  // Trailing 3-month average
  const trailing3Months = monthlyBreakdown.slice(-3)
  const trailing3AfterAvg =
    trailing3Months.length > 0
      ? trailing3Months.reduce((sum, m) => sum + m.revenue, 0) / trailing3Months.length
      : 0
  const trailing3Lift = trailing3AfterAvg - baseline

  return {
    baseline_monthly_revenue: baseline,
    current_month_revenue: currentMonthRevenue,
    total_incremental_revenue: totalIncrementalRevenue,
    attributed_incremental_revenue: attributedIncrementalRevenue,
    incremental_profit: incrementalProfit,
    revenue_growth_pct: revenueGrowthPct,
    avg_monthly_lift: avgMonthlyLift,
    trailing3_after_avg: trailing3AfterAvg,
    trailing3_lift: trailing3Lift,
    months_included: monthlyBreakdown.length,
    months: monthlyBreakdown,
  }
}

/**
 * Validate client configuration for revenue calculations
 */
export function validateClientConfig(client: Client): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!client.service_start_date) {
    errors.push('Service start date is required')
  }

  if (client.baseline_method === 'MANUAL') {
    if (
      client.baseline_revenue_manual === null ||
      client.baseline_revenue_manual === undefined ||
      client.baseline_revenue_manual < 0
    ) {
      errors.push('Manual baseline revenue must be a positive number when using MANUAL method')
    }
  }

  if (client.gross_margin_pct < 0 || client.gross_margin_pct > 1) {
    errors.push('Gross margin percentage must be between 0 and 1 (0-100%)')
  }

  if (client.attribution_pct < 0 || client.attribution_pct > 1) {
    errors.push('Attribution percentage must be between 0 and 1 (0-100%)')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
