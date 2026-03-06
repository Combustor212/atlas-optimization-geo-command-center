import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { getLatestHealthScore, getHealthScoreHistory } from '@/lib/data/health'

/**
 * GET /api/clients/[id]/health
 * Returns latest health score + history. Agency members see any client in agency; clients see only their own.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    if (!clientId) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, client_id, role')
      .eq('id', user.id)
      .single()

    const { agencyId, role } = (await getCurrentUserAgency()) || {}
    const isAgencyMember = role === 'admin' || role === 'staff'
    const isOwnClient = profile?.client_id === clientId

    if (!isAgencyMember && !isOwnClient) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (isAgencyMember && agencyId) {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('id', clientId)
        .eq('agency_id', agencyId)
        .single()
      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
    }

    const [latest, history] = await Promise.all([
      getLatestHealthScore(clientId),
      getHealthScoreHistory(clientId, 30),
    ])

    return NextResponse.json({
      latest: latest ?? null,
      history,
    })
  } catch (error) {
    console.error('GET /api/clients/[id]/health:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
