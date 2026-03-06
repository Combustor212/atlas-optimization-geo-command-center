import { NextRequest, NextResponse } from 'next/server'
import { deleteRevenueEntry } from '@/lib/data/revenue'

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const month = searchParams.get('month')

    if (!clientId || !month) {
      return NextResponse.json(
        { error: 'Missing required query parameters: clientId, month' },
        { status: 400 }
      )
    }

    const result = await deleteRevenueEntry(clientId, month)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete revenue entry' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete revenue API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
