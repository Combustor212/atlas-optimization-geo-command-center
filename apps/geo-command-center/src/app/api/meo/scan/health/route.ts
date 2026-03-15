/**
 * GET /api/meo/scan/health
 * Health check for MEO scan service (MGO backend compatible)
 */
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'meo-scan',
    version: 'v11.0',
    timestamp: new Date().toISOString(),
  })
}
