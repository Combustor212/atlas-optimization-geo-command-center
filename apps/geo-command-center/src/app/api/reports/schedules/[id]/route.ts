import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAgencyScope } from '@/lib/auth/scope'
import { reportSchedulePartialSchema } from '@/lib/reports/types'
import { validateBody } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const scope = await getAgencyScope()
  if (!scope || (scope.role !== 'admin' && scope.role !== 'staff')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const parsed = await validateBody(req, reportSchedulePartialSchema)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const supabase = await createClient()
  const updates: Record<string, unknown> = {}
  if (parsed.data.frequency !== undefined) updates.frequency = parsed.data.frequency
  if (parsed.data.day_of_week !== undefined) updates.day_of_week = parsed.data.day_of_week
  if (parsed.data.day_of_month !== undefined) updates.day_of_month = parsed.data.day_of_month
  if (parsed.data.time_of_day !== undefined) updates.time_of_day = parsed.data.time_of_day
  if (parsed.data.timezone !== undefined) updates.timezone = parsed.data.timezone
  if (parsed.data.recipients !== undefined) updates.recipients = parsed.data.recipients
  if (parsed.data.is_active !== undefined) updates.is_active = parsed.data.is_active
  if (parsed.data.client_id !== undefined) updates.client_id = parsed.data.client_id
  if (parsed.data.template_id !== undefined) updates.template_id = parsed.data.template_id

  const { data, error } = await supabase
    .from('report_schedules')
    .update(updates)
    .eq('id', id)
    .eq('agency_id', scope.agency_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const scope = await getAgencyScope()
  if (!scope || (scope.role !== 'admin' && scope.role !== 'staff')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase
    .from('report_schedules')
    .delete()
    .eq('id', id)
    .eq('agency_id', scope.agency_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
