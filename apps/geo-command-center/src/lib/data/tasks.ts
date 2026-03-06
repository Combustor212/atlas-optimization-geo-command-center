import { createClient } from '@/lib/supabase/server'
import type { Task, TaskComment } from '@/types/database'

export interface TaskFilters {
  client_id?: string
  location_id?: string
  status?: string
  priority?: string
  assigned_to_user_id?: string
  is_client_visible?: boolean
}

export interface TaskWithRelations extends Task {
  client?: { id: string; name: string }
  location?: { id: string; name: string } | null
  assigned_to?: { id: string; full_name: string | null } | null
  comment_count?: number
}

/**
 * Fetch tasks for agency (admin/staff) with optional filters.
 * For client scope, use getClientVisibleTasks.
 */
export async function getTasks(
  agencyId: string,
  filters: TaskFilters = {}
): Promise<TaskWithRelations[]> {
  const supabase = await createClient()
  let q = supabase
    .from('tasks')
    .select(`
      *,
      client:clients(id, name),
      location:locations(id, name),
      assigned_to:profiles!tasks_assigned_to_user_id_fkey(id, full_name)
    `)
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })

  if (filters.client_id) q = q.eq('client_id', filters.client_id)
  if (filters.location_id) q = q.eq('location_id', filters.location_id)
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.priority) q = q.eq('priority', filters.priority)
  if (filters.assigned_to_user_id) q = q.eq('assigned_to_user_id', filters.assigned_to_user_id)
  if (filters.is_client_visible !== undefined) q = q.eq('is_client_visible', filters.is_client_visible)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as TaskWithRelations[]
}

/**
 * Fetch tasks visible to client (portal): is_client_visible = true and client_id = clientId.
 */
export async function getClientVisibleTasks(clientId: string): Promise<TaskWithRelations[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      client:clients(id, name),
      location:locations(id, name),
      assigned_to:profiles!tasks_assigned_to_user_id_fkey(id, full_name)
    `)
    .eq('client_id', clientId)
    .eq('is_client_visible', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as TaskWithRelations[]
}

/**
 * Get a single task by id. Caller must enforce agency/client access.
 */
export async function getTaskById(taskId: string): Promise<TaskWithRelations | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      client:clients(id, name),
      location:locations(id, name),
      assigned_to:profiles!tasks_assigned_to_user_id_fkey(id, full_name)
    `)
    .eq('id', taskId)
    .single()
  if (error || !data) return null
  return data as TaskWithRelations
}

/**
 * Log task activity (admin/staff only via API).
 */
export async function logTaskActivity(
  agencyId: string,
  taskId: string,
  eventType: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('task_activity').insert({
    agency_id: agencyId,
    task_id: taskId,
    event_type: eventType,
    metadata,
  })
}

/**
 * Get comments for a task.
 */
export async function getTaskComments(taskId: string): Promise<(TaskComment & { user?: { full_name: string | null } })[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('task_comments')
    .select('*, user:profiles!task_comments_user_id_fkey(full_name)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as (TaskComment & { user?: { full_name: string | null } })[]
}
