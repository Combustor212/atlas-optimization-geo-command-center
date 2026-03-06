import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAgencyScope } from '@/lib/auth/scope'
import { getTaskById, getTaskComments } from '@/lib/data/tasks'
import { createTaskCommentSchema } from '@/lib/validation'
import { validateBody } from '@/lib/validation'

export const dynamic = 'force-dynamic'

/**
 * GET /api/tasks/[id]/comments - List comments. Agency: task in agency; Client: only if task is_client_visible and own client.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params
  const scope = await getAgencyScope()
  if (!scope) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const task = await getTaskById(taskId)
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

  const comments = await getTaskComments(taskId)
  return NextResponse.json({ comments })
}

/**
 * POST /api/tasks/[id]/comments - Add comment (admin/staff only).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params
  const scope = await getAgencyScope()
  if (!scope || (scope.role !== 'admin' && scope.role !== 'staff')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const task = await getTaskById(taskId)
  if (!task || task.agency_id !== scope.agency_id) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const parsed = await validateBody(req, createTaskCommentSchema)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      agency_id: scope.agency_id,
      task_id: taskId,
      user_id: scope.user_id,
      comment: parsed.data.comment,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
