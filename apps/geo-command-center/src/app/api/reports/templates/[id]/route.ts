import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAgencyScope } from '@/lib/auth/scope'
import { reportTemplateSchema } from '@/lib/reports/types'
import { validateBody } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const scope = await getAgencyScope()
  if (!scope || (scope.role !== 'admin' && scope.role !== 'staff')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('report_templates')
    .select('*')
    .eq('id', id)
    .eq('agency_id', scope.agency_id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const scope = await getAgencyScope()
  if (!scope || (scope.role !== 'admin' && scope.role !== 'staff')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const parsed = await validateBody(req, reportTemplateSchema.partial())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('report_templates')
    .update({
      ...(parsed.data.name && { name: parsed.data.name }),
      ...(parsed.data.branding && { branding: parsed.data.branding }),
      ...(parsed.data.sections && { sections: parsed.data.sections }),
    })
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
    .from('report_templates')
    .delete()
    .eq('id', id)
    .eq('agency_id', scope.agency_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
