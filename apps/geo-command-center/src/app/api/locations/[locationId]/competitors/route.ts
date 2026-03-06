import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/scope'
import { errors, successResponse } from '@/lib/api/errors'
import { getLocationCompetitors } from '@/lib/data/competitors'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params
    
    // 1. Require authentication
    const user = await getSessionUser()
    if (!user) {
      return errors.unauthorized()
    }

    const supabase = await createClient()

    // 2. Verify user has access to this location
    const { data: location } = await supabase
      .from('locations')
      .select('client_id, clients!inner(agency_id)')
      .eq('id', locationId)
      .single()

    if (!location) {
      return errors.notFound('Location')
    }

    // 3. Check access based on role
    let hasAccess = false
    
    if (user.role === 'admin' || user.role === 'staff') {
      // @ts-expect-error Supabase nested select typing
      hasAccess = location.clients?.agency_id === user.agency_id
    } else if (user.role === 'client') {
      hasAccess = location.client_id === user.client_id
    }

    if (!hasAccess) {
      return errors.forbidden('No access to this location')
    }

    // 4. Fetch competitors with snapshots
    const competitors = await getLocationCompetitors(locationId)

    // 5. Return response
    return successResponse({ competitors })
    
  } catch (error) {
    console.error('API error:', error)
    return errors.internalError()
  }
}
