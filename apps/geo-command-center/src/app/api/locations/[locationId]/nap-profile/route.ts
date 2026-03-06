import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/scope'
import { errors, successResponse } from '@/lib/api/errors'
import { getNapProfileByLocationId } from '@/lib/data/citations'

async function assertLocationAccess(locationId: string, requireAgency = false) {
  const user = await getSessionUser()
  if (!user) return { error: errors.unauthorized(), location: null }
  const supabase = await createClient()
  const { data: location } = await supabase
    .from('locations')
    .select('client_id, clients!inner(agency_id)')
    .eq('id', locationId)
    .single()
  if (!location) return { error: errors.notFound('Location'), location: null }
  const clients = location.clients as { agency_id: string } | { agency_id: string }[] | null
  const agencyId = clients ? (Array.isArray(clients) ? clients[0]?.agency_id : clients.agency_id) : undefined
  let hasAccess = false
  if (user.role === 'admin' || user.role === 'staff') {
    hasAccess = agencyId === user.agency_id
  } else if (user.role === 'client') {
    hasAccess = location.client_id === user.client_id
  }
  if (!hasAccess) return { error: errors.forbidden('No access to this location'), location: null }
  if (requireAgency && user.role === 'client') return { error: errors.forbidden('Only agency staff can modify NAP profile'), location: null }
  return { error: null, location: { ...location, agencyId } }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params
    const { error } = await assertLocationAccess(locationId)
    if (error) return error
    const profile = await getNapProfileByLocationId(locationId)
    return successResponse({ profile })
  } catch (e) {
    console.error('API error:', e)
    return errors.internalError()
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params
    const { error, location } = await assertLocationAccess(locationId, true)
    if (error) return error
    if (!location) return errors.notFound('Location')
    const body = await request.json()
    const canonical_name = body?.canonical_name?.trim()
    const canonical_address = body?.canonical_address?.trim()
    const canonical_phone = body?.canonical_phone?.trim()
    const canonical_website = body?.canonical_website === undefined ? undefined : (body.canonical_website === null || body.canonical_website === '' ? null : String(body.canonical_website).trim())
    if (!canonical_name || !canonical_address || !canonical_phone) {
      return errors.validationError('canonical_name, canonical_address, and canonical_phone are required')
    }
    const agency_id = location.agencyId!
    const supabase = await createClient()
    const { data, error: upsertError } = await supabase
      .from('nap_profiles')
      .upsert(
        {
          agency_id,
          location_id: locationId,
          canonical_name,
          canonical_address,
          canonical_phone,
          ...(canonical_website !== undefined && { canonical_website }),
        },
        { onConflict: 'location_id' }
      )
      .select()
      .single()
    if (upsertError) {
      console.error('Upsert nap_profile error:', upsertError)
      return errors.internalError()
    }
    return successResponse({ profile: data })
  } catch (e) {
    console.error('API error:', e)
    return errors.internalError()
  }
}
