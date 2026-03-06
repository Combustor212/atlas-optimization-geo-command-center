import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAgencyScope } from '@/lib/auth/scope'
import { reportTemplateSchema } from '@/lib/reports/types'
import { validateBody } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET() {
  const scope = await getAgencyScope()
  if (!scope || (scope.role !== 'admin' && scope.role !== 'staff')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('report_templates')
    .select('*')
    .eq('agency_id', scope.agency_id)
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const scope = await getAgencyScope()
  if (!scope || (scope.role !== 'admin' && scope.role !== 'staff')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = await validateBody(req, reportTemplateSchema)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('report_templates')
    .insert({
      agency_id: scope.agency_id,
      name: parsed.data.name,
      branding: parsed.data.branding,
      sections: parsed.data.sections,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
