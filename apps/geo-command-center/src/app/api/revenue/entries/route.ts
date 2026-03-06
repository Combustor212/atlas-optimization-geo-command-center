import { NextRequest, NextResponse } from 'next/server'
import { getClientRevenueEntries } from '@/lib/data/revenue'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId query parameter is required' },
        { status: 400 }
      )
    }

    const entries = await getClientRevenueEntries(clientId)

    return NextResponse.json({ entries })
  } catch (error) {
    console.error('Error in GET /api/revenue/entries:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
