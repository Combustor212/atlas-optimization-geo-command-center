import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/scope'
import { errors, successResponse } from '@/lib/api/errors'
import { getRecommendations } from '@/lib/data/recommendations'

export async function GET(
  request: NextRequest,
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

    let hasAccess = false
    if (user.role === 'admin' || user.role === 'staff') {
      // @ts-expect-error nested select
      hasAccess = location.clients?.agency_id === user.agency_id
    } else if (user.role === 'client') {
      hasAccess = location.client_id === user.client_id
    }

    if (!hasAccess) return errors.forbidden('No access to this location')

    const searchParams = request.nextUrl.searchParams
    const severity = searchParams.get('severity') ?? undefined
    const status = searchParams.get('status') ?? undefined
    const type = searchParams.get('type') ?? undefined

    const recommendations = await getRecommendations(locationId, {
      severity: severity || undefined,
      status: status || undefined,
      type: type || undefined,
    })

    return successResponse({ recommendations })
  } catch (error) {
    console.error('API error:', error)
    return errors.internalError()
  }
}
