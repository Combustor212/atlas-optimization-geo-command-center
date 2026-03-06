import { createClient } from '@/lib/supabase/server'
import { requireRole, getSessionUser } from '@/lib/auth/scope'
import { errors, successResponse } from '@/lib/api/errors'
import { generateAndUpsertRecommendations } from '@/lib/data/recommendations'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    await requireRole(['admin', 'staff'])
    const user = await getSessionUser()
    if (!user?.agency_id) return errors.forbidden('No agency access')

    const { locationId } = await params

    const supabase = await createClient()
    const { data: location } = await supabase
      .from('locations')
      .select('client_id, clients!inner(agency_id)')
      .eq('id', locationId)
      .single()

    if (!location) return errors.notFound('Location')
    const clients = location.clients as { agency_id: string } | { agency_id: string }[] | null
    const agencyId = clients ? (Array.isArray(clients) ? clients[0]?.agency_id : clients.agency_id) : undefined
    if (agencyId !== user.agency_id) return errors.agencyMismatch()

    const recommendations = await generateAndUpsertRecommendations(
      locationId,
      agencyId!,
      location.client_id
    )

    return successResponse({
      message: 'Recommendations generated',
      count: recommendations.length,
      recommendations,
    })
  } catch (error) {
    console.error('API error:', error)
    return errors.internalError()
  }
}
