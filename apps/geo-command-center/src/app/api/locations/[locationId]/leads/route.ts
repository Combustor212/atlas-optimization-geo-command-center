import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/scope'
import { errors, createdResponse } from '@/lib/api/errors'
import { validateBody, createLeadEventSchema } from '@/lib/validation'
import { createLeadEventWithAttribution } from '@/lib/data/attribution'

export async function POST(
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

    if (user.role !== 'admin' && user.role !== 'staff') {
      return errors.forbidden('Only agency members can create lead events')
    }
    const clients = location.clients as { agency_id: string } | { agency_id: string }[] | null
    const agencyMatch = clients ? (Array.isArray(clients) ? clients[0]?.agency_id : clients.agency_id) === user.agency_id : false
    if (!agencyMatch) return errors.forbidden('No access to this location')

    const parsed = await validateBody(request, createLeadEventSchema)
    if (!parsed.success) return errors.validationError(parsed.error)

    const { event_type, value, metadata, occurred_at } = parsed.data
    const result = await createLeadEventWithAttribution({
      location_id: locationId,
      event_type,
      value: value ?? null,
      metadata: metadata ?? undefined,
      occurred_at: occurred_at ?? undefined,
    })

    if (!result) return errors.internalError('Failed to create lead event')
    return createdResponse({
      event: result.event,
      attributions: result.attributions,
    })
  } catch (err) {
    console.error('POST /api/locations/[locationId]/leads:', err)
    return errors.internalError()
  }
}
