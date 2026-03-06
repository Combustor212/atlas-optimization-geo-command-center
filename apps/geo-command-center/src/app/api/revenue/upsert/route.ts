import { NextRequest, NextResponse } from 'next/server'
import { upsertRevenueEntry } from '@/lib/data/revenue'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, agencyId, month, revenue, source, notes } = body

    // Validation
    if (!clientId || !agencyId || !month) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, agencyId, month' },
        { status: 400 }
      )
    }

    if (typeof revenue !== 'number' || revenue < 0) {
      return NextResponse.json(
        { error: 'Revenue must be a positive number' },
        { status: 400 }
      )
    }

    // Validate month format (YYYY-MM-DD)
    const monthRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!monthRegex.test(month)) {
      return NextResponse.json(
        { error: 'Month must be in YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    const result = await upsertRevenueEntry({
      clientId,
      agencyId,
      month,
      revenue,
      source,
      notes,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to save revenue entry' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('Error in upsert revenue API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
