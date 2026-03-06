import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/scope'
import { errors, successResponse } from '@/lib/api/errors'
import { getAttributionSummary, parseRangeToDays } from '@/lib/data/attribution'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params
    const user = await getSessionUser()
    if (!user) return errors.unauthorized()

    const supabase = await createClient()
    const { data: location } = await supabase
      .from('locations')
      .select('id, client_id, clients!inner(agency_id)')
      .eq('id', locationId)
      .single()

    if (!location) return errors.notFound('Location')

    const clients = location.clients as { agency_id: string } | { agency_id: string }[] | null
    const agencyId = clients ? (Array.isArray(clients) ? clients[0]?.agency_id : clients.agency_id) : undefined
    let hasAccess = false
    if (user.role === 'admin' || user.role === 'staff') {
      hasAccess = agencyId === user.agency_id
    } else if (user.role === 'client') {
      hasAccess = location.client_id === user.client_id
    }
    if (!hasAccess) return errors.forbidden('No access to this location')

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range')
    const days = parseRangeToDays(range)

    const summary = await getAttributionSummary(locationId, days)
    if (!summary) return errors.internalError('Failed to load attribution summary')
    return successResponse(summary)
  } catch (err) {
    console.error('GET /api/locations/[locationId]/attribution/summary:', err)
    return errors.internalError()
  }
}
