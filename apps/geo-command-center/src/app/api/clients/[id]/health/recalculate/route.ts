import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { calculateAndStoreClientHealth } from '@/lib/health/score'

/**
 * POST /api/clients/[id]/health/recalculate
 * Compute and store health score. Admin/staff only.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    if (!clientId) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
    }

    const { agencyId, role } = (await getCurrentUserAgency()) || {}
    if (!agencyId || (role !== 'admin' && role !== 'staff')) {
      return NextResponse.json({ error: 'Forbidden: admin or staff required' }, { status: 403 })
    }

    const supabase = await createClient()
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('agency_id', agencyId)
      .single()
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const body = await _request.json().catch(() => ({}))
    const locationId = (body as { locationId?: string }).locationId ?? null

    const row = await calculateAndStoreClientHealth(clientId, locationId, agencyId)
    if (!row) {
      return NextResponse.json({ error: 'Failed to save health score' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: row,
    })
  } catch (error) {
    console.error('POST /api/clients/[id]/health/recalculate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
