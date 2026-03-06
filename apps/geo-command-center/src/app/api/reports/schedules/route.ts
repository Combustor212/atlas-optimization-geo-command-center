import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAgencyScope } from '@/lib/auth/scope'
import { reportScheduleSchema } from '@/lib/reports/types'
import { validateBody } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const scope = await getAgencyScope()
  if (!scope || (scope.role !== 'admin' && scope.role !== 'staff')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const clientId = req.nextUrl.searchParams.get('client_id')

  const supabase = await createClient()
  let q = supabase
    .from('report_schedules')
    .select('*, report_templates(name), clients(name)')
    .eq('agency_id', scope.agency_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (clientId) {
    q = q.eq('client_id', clientId)
  }

  const { data, error } = await q

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const scope = await getAgencyScope()
  if (!scope || (scope.role !== 'admin' && scope.role !== 'staff')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = await validateBody(req, reportScheduleSchema)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: template } = await supabase
    .from('report_templates')
    .select('id')
    .eq('id', parsed.data.template_id)
    .eq('agency_id', scope.agency_id)
    .single()

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', parsed.data.client_id)
    .eq('agency_id', scope.agency_id)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('report_schedules')
    .insert({
      agency_id: scope.agency_id,
      client_id: parsed.data.client_id,
      template_id: parsed.data.template_id,
      frequency: parsed.data.frequency,
      day_of_week: parsed.data.day_of_week ?? null,
      day_of_month: parsed.data.day_of_month ?? null,
      time_of_day: parsed.data.time_of_day,
      timezone: parsed.data.timezone,
      recipients: parsed.data.recipients,
      is_active: parsed.data.is_active,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
