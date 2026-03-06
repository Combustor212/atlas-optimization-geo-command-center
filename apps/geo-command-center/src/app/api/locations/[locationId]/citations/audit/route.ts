import { getSessionUser } from '@/lib/auth/scope'
import { errors, successResponse } from '@/lib/api/errors'
import { runAndStoreCitationAudit, getLatestCitationAudit } from '@/lib/data/citations'
import { createClient } from '@/lib/supabase/server'

async function assertLocationAccess(locationId: string) {
  const user = await getSessionUser()
  if (!user) return { error: errors.unauthorized(), user: null }
  const supabase = await createClient()
  const { data: location } = await supabase
    .from('locations')
    .select('client_id, clients!inner(agency_id)')
    .eq('id', locationId)
    .single()
  if (!location) return { error: errors.notFound('Location'), user: null }
  const clients = location.clients as { agency_id: string } | { agency_id: string }[] | null
  const agencyId = clients ? (Array.isArray(clients) ? clients[0]?.agency_id : clients.agency_id) : undefined
  let hasAccess = false
  if (user.role === 'admin' || user.role === 'staff') {
    hasAccess = agencyId === user.agency_id
  } else if (user.role === 'client') {
    hasAccess = location.client_id === user.client_id
  }
  if (!hasAccess) return { error: errors.forbidden('No access to this location'), user: null }
  return { error: null, user }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params
    const { error } = await assertLocationAccess(locationId)
    if (error) return error
    const audit = await getLatestCitationAudit(locationId)
    return successResponse({ audit })
  } catch (e) {
    console.error('API error:', e)
    return errors.internalError()
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params
    const { error, user } = await assertLocationAccess(locationId)
    if (error) return error
    if (user?.role === 'client') return errors.forbidden('Only agency staff can run audits')
    const audit = await runAndStoreCitationAudit(locationId)
    if (!audit) return errors.internalError()
    return successResponse({ audit })
  } catch (e) {
    console.error('API error:', e)
    return errors.internalError()
  }
}
