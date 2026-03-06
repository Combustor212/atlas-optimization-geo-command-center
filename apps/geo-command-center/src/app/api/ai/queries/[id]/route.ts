import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { errors, successResponse, noContentResponse } from '@/lib/api/errors'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { agencyId, role } = (await getCurrentUserAgency()) || {}
  if (!agencyId || (role !== 'admin' && role !== 'staff')) return errors.unauthorized()

  const body = await _req.json().catch(() => ({}))
  const updates: { is_active?: boolean; query_text?: string; platform?: string; frequency?: string } = {}
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active
  if (typeof body.query_text === 'string') updates.query_text = body.query_text.trim()
  if (body.platform) updates.platform = body.platform
  if (body.frequency) updates.frequency = body.frequency

  if (Object.keys(updates).length === 0) return errors.badRequest('No fields to update')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_queries')
    .update(updates)
    .eq('id', id)
    .eq('agency_id', agencyId)
    .select()
    .single()

  if (error) return errors.notFound('Query')
  return successResponse({ query: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { agencyId, role } = (await getCurrentUserAgency()) || {}
  if (!agencyId || (role !== 'admin' && role !== 'staff')) return errors.unauthorized()

  const supabase = await createClient()
  const { error } = await supabase.from('ai_queries').delete().eq('id', id).eq('agency_id', agencyId)
  if (error) return errors.notFound('Query')
  return noContentResponse()
}
