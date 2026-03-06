import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAgencyScope } from '@/lib/auth/scope'
import { getTasks } from '@/lib/data/tasks'
import { createTaskSchema } from '@/lib/validation'
import { validateBody } from '@/lib/validation'
import { logTaskActivity } from '@/lib/data/tasks'

export const dynamic = 'force-dynamic'

/**
 * GET /api/tasks?client_id=&location_id=&status=&priority=&assigned_to_user_id=
 * Agency: admin/staff get filtered tasks. Client: returns only is_client_visible tasks for their client_id.
 */
export async function GET(req: NextRequest) {
  const scope = await getAgencyScope()
  if (!scope) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    if (scope.role === 'client') {
      if (!scope.client_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const { getClientVisibleTasks } = await import('@/lib/data/tasks')
      const tasks = await getClientVisibleTasks(scope.client_id)
      return NextResponse.json({ tasks })
    }

    const agencyId = scope.agency_id
    const searchParams = req.nextUrl.searchParams
    const filters = {
      client_id: searchParams.get('client_id') ?? undefined,
      location_id: searchParams.get('location_id') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      priority: searchParams.get('priority') ?? undefined,
      assigned_to_user_id: searchParams.get('assigned_to_user_id') ?? undefined,
    }
    const tasks = await getTasks(agencyId, filters)
    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('GET /api/tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/tasks - Create task (admin/staff only).
 */
export async function POST(req: NextRequest) {
  const scope = await getAgencyScope()
  if (!scope || (scope.role !== 'admin' && scope.role !== 'staff')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = await validateBody(req, createTaskSchema)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', parsed.data.client_id)
    .eq('agency_id', scope.agency_id)
    .single()
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  if (parsed.data.location_id) {
    const { data: loc } = await supabase
      .from('locations')
      .select('id')
      .eq('id', parsed.data.location_id)
      .eq('client_id', parsed.data.client_id)
      .single()
    if (!loc) {
      return NextResponse.json({ error: 'Location not found or does not belong to client' }, { status: 400 })
    }
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      agency_id: scope.agency_id,
      client_id: parsed.data.client_id,
      location_id: parsed.data.location_id ?? null,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      status: parsed.data.status,
      priority: parsed.data.priority,
      due_date: parsed.data.due_date ?? null,
      assigned_to_user_id: parsed.data.assigned_to_user_id ?? null,
      created_by_user_id: scope.user_id,
      is_client_visible: parsed.data.is_client_visible,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logTaskActivity(scope.agency_id, task.id, 'created', { title: task.title })
  return NextResponse.json(task)
}
