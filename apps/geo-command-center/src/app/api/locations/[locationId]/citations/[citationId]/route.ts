import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/scope'
import { errors, successResponse, noContentResponse } from '@/lib/api/errors'
import type { CitationStatus } from '@/types/database'

const STATUSES: CitationStatus[] = ['present', 'missing', 'duplicate', 'incorrect']

async function assertCitationAccess(locationId: string, citationId: string, requireAgency = false) {
  const user = await getSessionUser()
  if (!user) return { error: errors.unauthorized(), agencyId: null }
  const supabase = await createClient()
  const { data: citation } = await supabase
    .from('citations')
    .select('id, location_id, agency_id')
    .eq('id', citationId)
    .eq('location_id', locationId)
    .single()
  if (!citation) return { error: errors.notFound('Citation'), agencyId: null }
  let hasAccess = false
  if (user.role === 'admin' || user.role === 'staff') {
    hasAccess = citation.agency_id === user.agency_id
  } else if (user.role === 'client') {
    const { data: loc } = await supabase
      .from('locations')
      .select('client_id')
      .eq('id', locationId)
      .single()
    hasAccess = loc?.client_id === user.client_id
  }
  if (!hasAccess) return { error: errors.forbidden('No access to this citation'), agencyId: null }
  if (requireAgency && user.role === 'client') return { error: errors.forbidden('Only agency staff can modify citations'), agencyId: null }
  return { error: null, agencyId: citation.agency_id }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string; citationId: string }> }
) {
  try {
    const { locationId, citationId } = await params
    const { error } = await assertCitationAccess(locationId, citationId, true)
    if (error) return error
    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (body?.directory_name !== undefined) updates.directory_name = String(body.directory_name).trim()
    if (body?.url !== undefined) updates.url = body.url === null || body.url === '' ? null : String(body.url).trim()
    if (body?.status !== undefined && STATUSES.includes(body.status)) updates.status = body.status
    if (body?.nap_snapshot !== undefined && typeof body.nap_snapshot === 'object') updates.nap_snapshot = body.nap_snapshot
    if (Object.keys(updates).length === 0) return errors.badRequest('No valid fields to update')
    const supabase = await createClient()
    const { data, error: updateError } = await supabase
      .from('citations')
      .update(updates)
      .eq('id', citationId)
      .eq('location_id', locationId)
      .select()
      .single()
    if (updateError) {
      console.error('Update citation error:', updateError)
      return errors.internalError()
    }
    return successResponse({ citation: data })
  } catch (e) {
    console.error('API error:', e)
    return errors.internalError()
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ locationId: string; citationId: string }> }
) {
  try {
    const { locationId, citationId } = await params
    const { error } = await assertCitationAccess(locationId, citationId, true)
    if (error) return error
    const supabase = await createClient()
    const { error: deleteError } = await supabase
      .from('citations')
      .delete()
      .eq('id', citationId)
      .eq('location_id', locationId)
    if (deleteError) {
      console.error('Delete citation error:', deleteError)
      return errors.internalError()
    }
    return noContentResponse()
  } catch (e) {
    console.error('API error:', e)
    return errors.internalError()
  }
}
