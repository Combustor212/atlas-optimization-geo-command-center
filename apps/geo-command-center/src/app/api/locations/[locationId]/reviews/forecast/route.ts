import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/scope'
import { errors, successResponse } from '@/lib/api/errors'
import {
  computeLocationForecast,
  saveReviewForecast,
  getLatestReviewForecast,
} from '@/lib/data/reviewForecasts'

async function getLocationScope(locationId: string): Promise<{ agencyId: string; clientId: string } | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('locations')
    .select('client_id, clients!inner(agency_id)')
    .eq('id', locationId)
    .single()
  if (error || !data) return null
  const clients = (data as { client_id: string; clients: { agency_id: string } | { agency_id: string }[] }).clients
  const agencyId = clients ? (Array.isArray(clients) ? clients[0]?.agency_id : clients.agency_id) : undefined
  if (!agencyId) return null
  return { agencyId, clientId: (data as { client_id: string }).client_id }
}

/**
 * GET /api/locations/[locationId]/reviews/forecast
 * Returns the latest stored forecast for the location.
 * Admin/staff and client (via location ownership) can read.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return errors.unauthorized()

    const { locationId } = await params
    const scope = await getLocationScope(locationId)
    if (!scope) return errors.notFound('Location')

    let hasAccess = false
    if (user.role === 'admin' || user.role === 'staff') {
      hasAccess = scope.agencyId === user.agency_id
    } else if (user.role === 'client') {
      const supabase = await createClient()
      const { data: loc } = await supabase
        .from('locations')
        .select('client_id')
        .eq('id', locationId)
        .single()
      hasAccess = loc?.client_id === user.client_id
    }

    if (!hasAccess) return errors.forbidden('No access to this location')

    const forecast = await getLatestReviewForecast(locationId)
    return successResponse({ forecast })
  } catch (error) {
    console.error('API error:', error)
    return errors.internalError()
  }
}

/**
 * POST /api/locations/[locationId]/reviews/forecast
 * Calculates and stores the latest forecast. Optional body: { competitorId?: string }.
 * Admin/staff only (write).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return errors.unauthorized()
    if (user.role !== 'admin' && user.role !== 'staff') {
      return errors.forbidden('Only admin or staff can create forecasts')
    }

    const { locationId } = await params
    const scope = await getLocationScope(locationId)
    if (!scope) return errors.notFound('Location')
    if (scope.agencyId !== user.agency_id) return errors.agencyMismatch()

    let competitorId: string | null = null
    try {
      const body = await request.json().catch(() => ({}))
      if (body && typeof body.competitorId === 'string') {
        competitorId = body.competitorId
      }
    } catch {
      // ignore invalid JSON
    }

    const computed = await computeLocationForecast({
      locationId,
      agencyId: scope.agencyId,
      clientId: scope.clientId,
      competitorId: competitorId || undefined,
    })

    const saved = await saveReviewForecast(
      {
        locationId,
        agencyId: scope.agencyId,
        clientId: scope.clientId,
        competitorId,
      },
      computed
    )

    if (!saved) return errors.internalError('Failed to save forecast')

    return successResponse({ forecast: saved })
  } catch (error) {
    console.error('API error:', error)
    return errors.internalError()
  }
}
