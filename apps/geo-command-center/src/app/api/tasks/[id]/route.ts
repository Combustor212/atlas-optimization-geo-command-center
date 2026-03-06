import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAgencyScope } from '@/lib/auth/scope'
import { getTaskById, logTaskActivity } from '@/lib/data/tasks'
import { patchTaskSchema } from '@/lib/validation'
import { validateBody } from '@/lib/validation'

export const dynamic = 'force-dynamic'

/**
 * GET /api/tasks/[id] - Get one task. Agency: any in agency; Client: only if is_client_visible and own client.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const scope = await getAgencyScope()
  if (!scope) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const task = await getTaskById(id)
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  if (scope.role === 'client') {
    if (task.client_id !== scope.client_id || !task.is_client_visible) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } else {
    if (task.agency_id !== scope.agency_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return NextResponse.json(task)
}

/**
 * PATCH /api/tasks/[id] - Update task (admin/staff only).
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

  const task = await getTaskById(id)
  if (!task || task.agency_id !== scope.agency_id) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const parsed = await validateBody(req, patchTaskSchema)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (parsed.data.title !== undefined) updates.title = parsed.data.title
  if (parsed.data.description !== undefined) updates.description = parsed.data.description
  if (parsed.data.type !== undefined) updates.type = parsed.data.type
  if (parsed.data.status !== undefined) updates.status = parsed.data.status
  if (parsed.data.priority !== undefined) updates.priority = parsed.data.priority
  if (parsed.data.due_date !== undefined) updates.due_date = parsed.data.due_date ?? null
  if (parsed.data.assigned_to_user_id !== undefined) updates.assigned_to_user_id = parsed.data.assigned_to_user_id ?? null
  if (parsed.data.location_id !== undefined) updates.location_id = parsed.data.location_id ?? null
  if (parsed.data.is_client_visible !== undefined) updates.is_client_visible = parsed.data.is_client_visible

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(task)
  }

  const supabase = await createClient()
  const { data: updated, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logTaskActivity(scope.agency_id, id, 'updated', { updates: Object.keys(updates) })
  return NextResponse.json(updated)
}

/**
 * DELETE /api/tasks/[id] - Delete task (admin/staff only).
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

  const task = await getTaskById(id)
  if (!task || task.agency_id !== scope.agency_id) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const supabase = await createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
