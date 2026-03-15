/**
 * GET /api/geo/explain-job/:jobId
 * Poll for GEO explain job status - MGO backend compatible.
 * Geo Command Center uses sync GEO (no job/polling). This endpoint returns 404
 * for unknown jobs since we don't maintain an in-memory job store.
 * Kept for API compatibility when frontend has stale explainJobId.
 */
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  if (!jobId) {
    return NextResponse.json(
      {
        status: 'failed',
        step: 'INIT',
        progress: 0,
        hasExplain: false,
        error: 'Missing jobId',
      },
      { status: 400 }
    )
  }

  // Geo Command Center returns sync geo - no job polling. Return 404 for any jobId.
  return NextResponse.json(
    {
      status: 'failed',
      step: 'INIT',
      progress: 0,
      hasExplain: false,
      error: 'JOB_NOT_FOUND',
    },
    {
      status: 404,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      },
    }
  )
}
