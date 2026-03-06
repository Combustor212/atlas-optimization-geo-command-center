import { NextRequest, NextResponse } from 'next/server'
import {
  calculateRevenueImpact,
  isBaselineSufficient,
  validateClientConfig,
} from '@/lib/revenue/calculations'
import type { Client, ClientRevenueMonthly } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { client, entries } = body as {
      client: Client
      entries: ClientRevenueMonthly[]
    }

    if (!client || !entries) {
      return NextResponse.json(
        { error: 'Missing required fields: client, entries' },
        { status: 400 }
      )
    }

    // Validate client configuration
    const validation = validateClientConfig(client)
    if (!validation.valid) {
      return NextResponse.json({
        summary: null,
        configErrors: validation.errors,
        baselineWarning: null,
      })
    }

    // Check if we have a service start date
    if (!client.service_start_date) {
      return NextResponse.json({
        summary: null,
        configErrors: ['Service start date is required'],
        baselineWarning: null,
      })
    }

    // Build configuration
    const config = {
      serviceStartDate: new Date(client.service_start_date),
      baselineMethod: client.baseline_method,
      baselineRevenueManual: client.baseline_revenue_manual,
      grossMarginPct: client.gross_margin_pct,
      attributionPct: client.attribution_pct,
      excludePartialFirstMonth: client.exclude_partial_first_month,
      countOnlyPositiveLift: client.count_only_positive_lift,
      treatMissingMonthAsZero: client.treat_missing_month_as_zero,
    }

    // Check baseline sufficiency
    const baselineCheck = isBaselineSufficient(config, entries)
    let baselineWarning = null
    if (!baselineCheck.sufficient) {
      baselineWarning = baselineCheck.message || 'Insufficient baseline data'
    }

    // Calculate summary
    const summary = calculateRevenueImpact(config, entries)

    return NextResponse.json({
      summary,
      configErrors: [],
      baselineWarning,
    })
  } catch (error) {
    console.error('Error in revenue calculation API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
