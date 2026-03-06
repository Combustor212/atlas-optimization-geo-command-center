import { createClient } from '@/lib/supabase/server'
import { requireRole, getSessionUser } from '@/lib/auth/scope'
import { validateBody, patchRecommendationSchema } from '@/lib/validation'
import { errors, successResponse } from '@/lib/api/errors'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(['admin', 'staff'])
    const user = await getSessionUser()
    if (!user?.agency_id) return errors.forbidden('No agency access')

    const { id } = await params

    const validation = await validateBody(request, patchRecommendationSchema)
    if (!validation.success) {
      return errors.validationError(validation.error)
    }

    const { status } = validation.data

    const supabase = await createClient()

    const { data: existing, error: fetchError } = await supabase
      .from('recommendations')
      .select('id, agency_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !existing) return errors.notFound('Recommendation')
    if (existing.agency_id !== user.agency_id) return errors.agencyMismatch()

    const { data: updated, error: updateError } = await supabase
      .from('recommendations')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return errors.internalError('Failed to update recommendation')
    }

    const eventType = status === 'dismissed' ? 'dismissed' : 'status_changed'
    await supabase.from('recommendation_events').insert({
      agency_id: user.agency_id,
      recommendation_id: id,
      event_type: eventType,
      metadata: { previous_status: existing.status, new_status: status },
    })

    return successResponse(updated)
  } catch (error) {
    console.error('API error:', error)
    return errors.internalError()
  }
}
