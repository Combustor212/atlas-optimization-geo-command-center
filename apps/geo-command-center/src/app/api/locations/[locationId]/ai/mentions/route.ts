import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/scope'
import { errors, successResponse } from '@/lib/api/errors'
import { getAIMentionsForLocation } from '@/lib/data/ai-mentions'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params
    const user = await getSessionUser()
    if (!user) return errors.unauthorized()

    const supabase = await createClient()
    const { data: location } = await supabase
      .from('locations')
      .select('client_id, clients!inner(agency_id)')
      .eq('id', locationId)
      .single()

    if (!location) return errors.notFound('Location')

    const loc = location as { client_id: string; clients?: { agency_id: string } | { agency_id: string }[] }
    const clients = loc.clients
    const agencyId = Array.isArray(clients) ? clients[0]?.agency_id : clients?.agency_id
    let hasAccess = false
    if (user.role === 'admin' || user.role === 'staff') {
      hasAccess = agencyId === user.agency_id
    } else if (user.role === 'client') {
      hasAccess = loc.client_id === user.client_id
    }
    if (!hasAccess) return errors.forbidden('No access to this location')

    const mentions = await getAIMentionsForLocation(locationId, 365)
    const trend = mentions.map((m) => ({
      id: m.id,
      platform: m.platform,
      mention_count: m.mention_count,
      visibility_score: m.visibility_score,
      sentiment: m.sentiment,
      captured_at: m.captured_at,
      evidence: m.evidence,
    }))

    return successResponse({ trend })
  } catch (e) {
    console.error('GET ai/mentions error:', e)
    return errors.internalError()
  }
}
