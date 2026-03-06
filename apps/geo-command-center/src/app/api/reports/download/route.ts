import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { canAccessClient } from '@/lib/auth/scope'

export const dynamic = 'force-dynamic'

/**
 * GET /api/reports/download?runId=xxx
 * Returns a signed URL or redirects to the PDF.
 * Agency/staff can download any run in their agency; clients only their own.
 */
export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get('runId')
  if (!runId) {
    return NextResponse.json({ error: 'Missing runId' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: run } = await supabase
    .from('report_runs')
    .select('id, client_id, agency_id, pdf_path, status')
    .eq('id', runId)
    .single()

  if (!run || !run.pdf_path) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  if (run.status !== 'generated' && run.status !== 'sent') {
    return NextResponse.json({ error: 'Report not available' }, { status: 404 })
  }

  const canAccess = await canAccessClient(run.client_id)
  if (!canAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()
  const { data: signed, error } = await admin.storage
    .from('reports')
    .createSignedUrl(run.pdf_path, 60)

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
  }

  return NextResponse.redirect(signed.signedUrl)
}
