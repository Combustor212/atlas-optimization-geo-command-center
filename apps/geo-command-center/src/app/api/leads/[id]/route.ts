import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getAgencyScope } from '@/lib/auth/scope'

const ALLOWED_STATUSES = ['pending', 'need_to_follow_up', 'contacted', 'scheduled', 'followed_up', 'no_answer'] as const

export const dynamic = 'force-dynamic'

async function canAccessLead(leadAgencyId: string, scope: { agency_id: string; role: string } | null): Promise<boolean> {
  if (!scope || (scope.role !== 'admin' && scope.role !== 'staff')) return false
  // Admins see all leads (getAllLeadsForAdmin) and can delete any lead they can see
  if (scope.role === 'admin') return true
  if (leadAgencyId === scope.agency_id) return true
  const slug = process.env.AGS_LEADS_AGENCY_SLUG || 'my-agency'
  const admin = getSupabaseAdmin()
  const { data: agency } = await admin.from('agencies').select('id').eq('slug', slug).single()
  return agency ? leadAgencyId === agency.id : false
}

/**
 * PATCH /api/leads/[id] - Update lead follow-up status (admin/staff only).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const scope = await getAgencyScope()

  if (!scope || (scope.role !== 'admin' && scope.role !== 'staff')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { follow_up_status } = body

  if (follow_up_status !== null && follow_up_status !== undefined) {
    if (!ALLOWED_STATUSES.includes(follow_up_status)) {
      return NextResponse.json(
        { error: `Valid status required: ${ALLOWED_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }
  }

  const admin = getSupabaseAdmin()
  const { data: existing, error: fetchError } = await admin
    .from('leads')
    .select('id, agency_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }
  if (!(await canAccessLead(existing.agency_id, scope))) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}
  if (follow_up_status !== undefined) updates.follow_up_status = follow_up_status || null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(existing)
  }

  const { data: updated, error } = await admin
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}

/**
 * DELETE /api/leads/[id] - Delete a lead (admin/staff only).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const scope = await getAgencyScope()

  if (!scope || (scope.role !== 'admin' && scope.role !== 'staff')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()
  const { data: existing, error: fetchError } = await admin
    .from('leads')
    .select('id, agency_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }
  if (!(await canAccessLead(existing.agency_id, scope))) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const { error } = await admin.from('leads').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
