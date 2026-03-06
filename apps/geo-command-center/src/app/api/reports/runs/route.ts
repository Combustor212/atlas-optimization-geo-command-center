import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** GET runs - agency sees all in agency, client sees only their own */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, agency_id, client_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = req.nextUrl.searchParams.get('client_id')

  if (profile.role === 'client') {
    const cid = profile.client_id
    if (!cid || (clientId && clientId !== cid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { data, error } = await supabase
      .from('report_runs')
      .select('id, client_id, template_id, status, pdf_path, summary, run_at, created_at')
      .eq('client_id', cid)
      .in('status', ['generated', 'sent'])
      .order('run_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  }

  if (profile.role !== 'admin' && profile.role !== 'staff') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let q = supabase
    .from('report_runs')
    .select('id, client_id, template_id, status, pdf_path, summary, run_at, created_at, clients(name)')
    .eq('agency_id', profile.agency_id)
    .order('run_at', { ascending: false })
    .limit(100)

  if (clientId) {
    q = q.eq('client_id', clientId)
  }

  const { data, error } = await q

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
