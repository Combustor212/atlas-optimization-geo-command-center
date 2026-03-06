import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/scope'
import { errors, successResponse, createdResponse } from '@/lib/api/errors'
import { getCitationsByLocationId } from '@/lib/data/citations'
import type { CitationStatus } from '@/types/database'

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
  if (requireAgency && user.role === 'client') return { error: errors.forbidden('Only agency staff can modify citations'), location: null }
  return { error: null, location: { ...location, agencyId: agencyId! } }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params
    const { error } = await assertLocationAccess(locationId)
    if (error) return error
    const citations = await getCitationsByLocationId(locationId)
    return successResponse({ citations })
  } catch (e) {
    console.error('API error:', e)
    return errors.internalError()
  }
}

const STATUSES: CitationStatus[] = ['present', 'missing', 'duplicate', 'incorrect']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params
    const { error, location } = await assertLocationAccess(locationId, true)
    if (error) return error
    if (!location) return errors.notFound('Location')
    const body = await request.json()
    const directory_name = body?.directory_name?.trim()
    const url = body?.url?.trim() || null
    const status = body?.status && STATUSES.includes(body.status) ? body.status : 'present'
    const nap_snapshot = body?.nap_snapshot && typeof body.nap_snapshot === 'object' ? body.nap_snapshot : {}
    if (!directory_name) return errors.validationError('directory_name is required')
    const agency_id = location.agencyId
    const supabase = await createClient()
    const { data, error: insertError } = await supabase
      .from('citations')
      .insert({
        agency_id,
        client_id: location.client_id,
        location_id: locationId,
        directory_name,
        url,
        status,
        nap_snapshot,
      })
      .select()
      .single()
    if (insertError) {
      console.error('Insert citation error:', insertError)
      return errors.internalError()
    }
    return createdResponse({ citation: data })
  } catch (e) {
    console.error('API error:', e)
    return errors.internalError()
  }
}
