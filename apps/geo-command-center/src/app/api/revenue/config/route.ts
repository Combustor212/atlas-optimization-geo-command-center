import { NextRequest, NextResponse } from 'next/server'
import { updateClientRevenueConfig } from '@/lib/data/revenue'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, ...config } = body

    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required field: clientId' },
        { status: 400 }
      )
    }

    // Validate numeric fields if present
    if (config.gross_margin_pct !== undefined) {
      if (config.gross_margin_pct < 0 || config.gross_margin_pct > 1) {
        return NextResponse.json(
          { error: 'gross_margin_pct must be between 0 and 1' },
          { status: 400 }
        )
      }
    }

    if (config.attribution_pct !== undefined) {
      if (config.attribution_pct < 0 || config.attribution_pct > 1) {
        return NextResponse.json(
          { error: 'attribution_pct must be between 0 and 1' },
          { status: 400 }
        )
      }
    }

    const result = await updateClientRevenueConfig(clientId, config)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update client configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('Error in update client config API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
