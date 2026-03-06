/**
 * Unit Tests for Revenue Impact Calculation Logic
 * Run with: npx jest calculations.test.ts
 */

import {
  calculateBaseline,
  calculateMonthlyBreakdown,
  calculateRevenueImpact,
  isBaselineSufficient,
  validateClientConfig,
  getFirstDayOfMonth,
  formatMonthKey,
  parseMonthKey,
  addMonths,
  getAfterStartMonths,
} from '../calculations'
import type { ClientRevenueMonthly, Client } from '@/types/database'

// Mock data helpers
const createRevenueEntry = (
  month: string,
  revenue: number
): ClientRevenueMonthly => ({
  id: `test-${month}`,
  agency_id: 'test-agency',
  client_id: 'test-client',
  month,
  revenue,
  source: 'MANUAL',
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

const createMockClient = (overrides?: Partial<Client>): Client => ({
  id: 'test-client',
  agency_id: 'test-agency',
  name: 'Test Client',
  email: 'test@example.com',
  phone: null,
  business_name: 'Test Business',
  stripe_customer_id: null,
  service_start_date: '2024-01-01',
  currency: 'USD',
  baseline_method: 'AVG_PRE_3',
  baseline_revenue_manual: null,
  gross_margin_pct: 0.3,
  attribution_pct: 1.0,
  exclude_partial_first_month: false,
  count_only_positive_lift: true,
  treat_missing_month_as_zero: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

describe('Date Utilities', () => {
  test('getFirstDayOfMonth returns first day of month', () => {
    const date = new Date('2024-06-15')
    const result = getFirstDayOfMonth(date)
    expect(result.getDate()).toBe(1)
    expect(result.getMonth()).toBe(5) // June is month 5 (0-indexed)
    expect(result.getFullYear()).toBe(2024)
  })

  test('formatMonthKey formats date as YYYY-MM-01', () => {
    const date = new Date('2024-06-15')
    expect(formatMonthKey(date)).toBe('2024-06-01')
  })

  test('parseMonthKey parses YYYY-MM-DD string', () => {
    const result = parseMonthKey('2024-06-01')
    expect(result.getFullYear()).toBe(2024)
    expect(result.getMonth()).toBe(5)
    expect(result.getDate()).toBe(1)
  })

  test('addMonths adds correct number of months', () => {
    const date = new Date('2024-01-15')
    const result = addMonths(date, 3)
    expect(result.getMonth()).toBe(3) // April
    expect(result.getFullYear()).toBe(2024)
  })

  test('addMonths handles year rollover', () => {
    const date = new Date('2024-11-15')
    const result = addMonths(date, 3)
    expect(result.getMonth()).toBe(1) // February
    expect(result.getFullYear()).toBe(2025)
  })
})

describe('Baseline Calculation', () => {
  const entries = [
    createRevenueEntry('2023-09-01', 10000),
    createRevenueEntry('2023-10-01', 11000),
    createRevenueEntry('2023-11-01', 12000),
    createRevenueEntry('2023-12-01', 13000),
  ]

  test('AVG_PRE_3 calculates average of last 3 months', () => {
    const config = {
      serviceStartDate: new Date('2024-01-01'),
      baselineMethod: 'AVG_PRE_3' as const,
      grossMarginPct: 0.3,
      attributionPct: 1.0,
      excludePartialFirstMonth: false,
      countOnlyPositiveLift: true,
      treatMissingMonthAsZero: false,
    }

    const result = calculateBaseline(config, entries)
    // Average of 11000, 12000, 13000 = 12000
    expect(result).toBe(12000)
  })

  test('AVG_PRE_6 calculates average of last 6 months (or available)', () => {
    const config = {
      serviceStartDate: new Date('2024-01-01'),
      baselineMethod: 'AVG_PRE_6' as const,
      grossMarginPct: 0.3,
      attributionPct: 1.0,
      excludePartialFirstMonth: false,
      countOnlyPositiveLift: true,
      treatMissingMonthAsZero: false,
    }

    const result = calculateBaseline(config, entries)
    // Average of all 4 available months = (10000 + 11000 + 12000 + 13000) / 4 = 11500
    expect(result).toBe(11500)
  })

  test('SINGLE_PRE_1 uses last month before start', () => {
    const config = {
      serviceStartDate: new Date('2024-01-01'),
      baselineMethod: 'SINGLE_PRE_1' as const,
      grossMarginPct: 0.3,
      attributionPct: 1.0,
      excludePartialFirstMonth: false,
      countOnlyPositiveLift: true,
      treatMissingMonthAsZero: false,
    }

    const result = calculateBaseline(config, entries)
    expect(result).toBe(13000)
  })

  test('MANUAL uses baseline_revenue_manual', () => {
    const config = {
      serviceStartDate: new Date('2024-01-01'),
      baselineMethod: 'MANUAL' as const,
      baselineRevenueManual: 15000,
      grossMarginPct: 0.3,
      attributionPct: 1.0,
      excludePartialFirstMonth: false,
      countOnlyPositiveLift: true,
      treatMissingMonthAsZero: false,
    }

    const result = calculateBaseline(config, [])
    expect(result).toBe(15000)
  })

  test('Returns 0 when no baseline data available', () => {
    const config = {
      serviceStartDate: new Date('2024-01-01'),
      baselineMethod: 'AVG_PRE_3' as const,
      grossMarginPct: 0.3,
      attributionPct: 1.0,
      excludePartialFirstMonth: false,
      countOnlyPositiveLift: true,
      treatMissingMonthAsZero: false,
    }

    const result = calculateBaseline(config, [])
    expect(result).toBe(0)
  })
})

describe('Baseline Sufficiency Check', () => {
  test('isBaselineSufficient returns true for MANUAL with value', () => {
    const config = {
      serviceStartDate: new Date('2024-01-01'),
      baselineMethod: 'MANUAL' as const,
      baselineRevenueManual: 10000,
      grossMarginPct: 0.3,
      attributionPct: 1.0,
      excludePartialFirstMonth: false,
      countOnlyPositiveLift: true,
      treatMissingMonthAsZero: false,
    }

    const result = isBaselineSufficient(config, [])
    expect(result.sufficient).toBe(true)
  })

  test('isBaselineSufficient returns false for MANUAL without value', () => {
    const config = {
      serviceStartDate: new Date('2024-01-01'),
      baselineMethod: 'MANUAL' as const,
      baselineRevenueManual: null,
      grossMarginPct: 0.3,
      attributionPct: 1.0,
      excludePartialFirstMonth: false,
      countOnlyPositiveLift: true,
      treatMissingMonthAsZero: false,
    }

    const result = isBaselineSufficient(config, [])
    expect(result.sufficient).toBe(false)
    expect(result.message).toContain('Manual baseline revenue is required')
  })

  test('isBaselineSufficient checks for required months', () => {
    const config = {
      serviceStartDate: new Date('2024-01-01'),
      baselineMethod: 'AVG_PRE_3' as const,
      grossMarginPct: 0.3,
      attributionPct: 1.0,
      excludePartialFirstMonth: false,
      countOnlyPositiveLift: true,
      treatMissingMonthAsZero: false,
    }

    const insufficientEntries = [
      createRevenueEntry('2023-11-01', 10000),
      createRevenueEntry('2023-12-01', 11000),
    ]

    const result = isBaselineSufficient(config, insufficientEntries)
    expect(result.sufficient).toBe(false)
    expect(result.message).toContain('requires 3 month(s)')
  })
})

describe('Monthly Breakdown Calculation', () => {
  test('calculates correct deltas and percentages', () => {
    const baseline = 10000
    const config = {
      serviceStartDate: new Date('2024-01-01'),
      baselineMethod: 'MANUAL' as const,
      baselineRevenueManual: baseline,
      grossMarginPct: 0.3,
      attributionPct: 1.0,
      excludePartialFirstMonth: false,
      countOnlyPositiveLift: true,
      treatMissingMonthAsZero: false,
    }

    const entries = [
      createRevenueEntry('2024-01-01', 12000),
      createRevenueEntry('2024-02-01', 11000),
    ]

    const result = calculateMonthlyBreakdown(baseline, config, entries)

    expect(result).toHaveLength(2)
    expect(result[0].revenue).toBe(12000)
    expect(result[0].delta).toBe(2000)
    expect(result[0].delta_pct).toBeCloseTo(20, 1)
    expect(result[0].attributed_delta).toBe(2000)
    expect(result[0].profit_delta).toBe(600) // 2000 * 0.3

    expect(result[1].revenue).toBe(11000)
    expect(result[1].delta).toBe(1000)
    expect(result[1].delta_pct).toBeCloseTo(10, 1)
  })

  test('handles baseline of zero without division error', () => {
    const config = {
      serviceStartDate: new Date('2024-01-01'),
      baselineMethod: 'MANUAL' as const,
      baselineRevenueManual: 0,
      grossMarginPct: 0.3,
      attributionPct: 1.0,
      excludePartialFirstMonth: false,
      countOnlyPositiveLift: true,
      treatMissingMonthAsZero: false,
    }

    const entries = [createRevenueEntry('2024-01-01', 10000)]

    const result = calculateMonthlyBreakdown(0, config, entries)

    expect(result[0].delta_pct).toBe(0)
  })

  test('applies attribution percentage correctly', () => {
    const config = {
      serviceStartDate: new Date('2024-01-01'),
      baselineMethod: 'MANUAL' as const,
      baselineRevenueManual: 10000,
      grossMarginPct: 0.3,
      attributionPct: 0.5, // 50% attribution
      excludePartialFirstMonth: false,
      countOnlyPositiveLift: true,
      treatMissingMonthAsZero: false,
    }

    const entries = [createRevenueEntry('2024-01-01', 12000)]

    const result = calculateMonthlyBreakdown(10000, config, entries)

    expect(result[0].delta).toBe(2000)
    expect(result[0].attributed_delta).toBe(1000) // 2000 * 0.5
    expect(result[0].profit_delta).toBe(300) // 1000 * 0.3
  })
})

describe('Complete Revenue Impact Calculation', () => {
  test('calculates full summary correctly', () => {
    const entries = [
      createRevenueEntry('2023-10-01', 10000),
      createRevenueEntry('2023-11-01', 11000),
      createRevenueEntry('2023-12-01', 12000),
      createRevenueEntry('2024-01-01', 15000),
      createRevenueEntry('2024-02-01', 16000),
      createRevenueEntry('2024-03-01', 14000),
    ]

    const config = {
      serviceStartDate: new Date('2024-01-01'),
      baselineMethod: 'AVG_PRE_3' as const,
      grossMarginPct: 0.3,
      attributionPct: 1.0,
      excludePartialFirstMonth: false,
      countOnlyPositiveLift: true,
      treatMissingMonthAsZero: false,
    }

    const result = calculateRevenueImpact(config, entries)

    // Baseline = average of 10000, 11000, 12000 = 11000
    expect(result.baseline_monthly_revenue).toBe(11000)

    // Current month = 14000
    expect(result.current_month_revenue).toBe(14000)

    // Total incremental = (15000-11000) + (16000-11000) + (14000-11000) = 4000 + 5000 + 3000 = 12000
    expect(result.total_incremental_revenue).toBe(12000)

    // Attributed = 12000 * 1.0 = 12000
    expect(result.attributed_incremental_revenue).toBe(12000)

    // Profit = 12000 * 0.3 = 3600
    expect(result.incremental_profit).toBe(3600)

    // Revenue growth = (14000 - 11000) / 11000 * 100 = 27.27%
    expect(result.revenue_growth_pct).toBeCloseTo(27.27, 1)

    // Avg monthly lift = 12000 / 3 = 4000
    expect(result.avg_monthly_lift).toBe(4000)

    // Trailing 3-month avg = (15000 + 16000 + 14000) / 3 = 15000
    expect(result.trailing3_after_avg).toBe(15000)

    // Trailing 3-month lift = 15000 - 11000 = 4000
    expect(result.trailing3_lift).toBe(4000)

    expect(result.months_included).toBe(3)
  })

  test('count_only_positive_lift excludes negative months', () => {
    const entries = [
      createRevenueEntry('2023-12-01', 10000),
      createRevenueEntry('2024-01-01', 12000), // +2000
      createRevenueEntry('2024-02-01', 8000),  // -2000
      createRevenueEntry('2024-03-01', 11000), // +1000
    ]

    const config = {
      serviceStartDate: new Date('2024-01-01'),
      baselineMethod: 'SINGLE_PRE_1' as const,
      grossMarginPct: 0.3,
      attributionPct: 1.0,
      excludePartialFirstMonth: false,
      countOnlyPositiveLift: true,
      treatMissingMonthAsZero: false,
    }

    const result = calculateRevenueImpact(config, entries)

    // With count_only_positive_lift: 2000 + 0 + 1000 = 3000
    expect(result.total_incremental_revenue).toBe(3000)
  })

  test('count_only_positive_lift false includes negative months', () => {
    const entries = [
      createRevenueEntry('2023-12-01', 10000),
      createRevenueEntry('2024-01-01', 12000), // +2000
      createRevenueEntry('2024-02-01', 8000),  // -2000
      createRevenueEntry('2024-03-01', 11000), // +1000
    ]

    const config = {
      serviceStartDate: new Date('2024-01-01'),
      baselineMethod: 'SINGLE_PRE_1' as const,
      grossMarginPct: 0.3,
      attributionPct: 1.0,
      excludePartialFirstMonth: false,
      countOnlyPositiveLift: false,
      treatMissingMonthAsZero: false,
    }

    const result = calculateRevenueImpact(config, entries)

    // With count_only_positive_lift false: 2000 + (-2000) + 1000 = 1000
    expect(result.total_incremental_revenue).toBe(1000)
  })
})

describe('Client Configuration Validation', () => {
  test('validates valid client config', () => {
    const client = createMockClient()
    const result = validateClientConfig(client)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('detects missing service_start_date', () => {
    const client = createMockClient({ service_start_date: null })
    const result = validateClientConfig(client)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('Service start date')
  })

  test('detects invalid manual baseline', () => {
    const client = createMockClient({
      baseline_method: 'MANUAL',
      baseline_revenue_manual: null,
    })
    const result = validateClientConfig(client)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('Manual baseline revenue')
  })

  test('detects invalid gross_margin_pct', () => {
    const client = createMockClient({ gross_margin_pct: 1.5 })
    const result = validateClientConfig(client)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('Gross margin')
  })

  test('detects invalid attribution_pct', () => {
    const client = createMockClient({ attribution_pct: -0.1 })
    const result = validateClientConfig(client)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('Attribution')
  })
})

describe('Exclude Partial First Month', () => {
  test('excludes first month when start date is not the 1st', () => {
    const config = {
      serviceStartDate: new Date('2024-01-15'), // Mid-month start
      baselineMethod: 'MANUAL' as const,
      baselineRevenueManual: 10000,
      grossMarginPct: 0.3,
      attributionPct: 1.0,
      excludePartialFirstMonth: true,
      countOnlyPositiveLift: true,
      treatMissingMonthAsZero: false,
    }

    const entries = [
      createRevenueEntry('2024-01-01', 12000),
      createRevenueEntry('2024-02-01', 13000),
    ]

    const months = getAfterStartMonths(config, entries, new Date('2024-02-28'))

    // Should exclude January, include February
    expect(months).not.toContain('2024-01-01')
    expect(months).toContain('2024-02-01')
  })

  test('includes first month when start date is the 1st', () => {
    const config = {
      serviceStartDate: new Date('2024-01-01'),
      baselineMethod: 'MANUAL' as const,
      baselineRevenueManual: 10000,
      grossMarginPct: 0.3,
      attributionPct: 1.0,
      excludePartialFirstMonth: true,
      countOnlyPositiveLift: true,
      treatMissingMonthAsZero: false,
    }

    const entries = [
      createRevenueEntry('2024-01-01', 12000),
      createRevenueEntry('2024-02-01', 13000),
    ]

    const months = getAfterStartMonths(config, entries, new Date('2024-02-28'))

    // Should include January
    expect(months).toContain('2024-01-01')
    expect(months).toContain('2024-02-01')
  })
})
