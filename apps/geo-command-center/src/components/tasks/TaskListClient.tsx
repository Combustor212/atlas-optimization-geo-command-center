'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  Plus,
  Filter,
  ChevronDown,
  MessageSquare,
  Calendar,
  User,
  MapPin,
  Building,
  Eye,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react'
import type { TaskType, TaskStatus, TaskPriority } from '@/types/database'

export interface TaskWithRelations {
  id: string
  agency_id: string
  client_id: string
  location_id: string | null
  title: string
  description: string | null
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  assigned_to_user_id: string | null
  created_by_user_id: string
  is_client_visible: boolean
  created_at: string
  updated_at: string
  client?: { id: string; name: string }
  location?: { id: string; name: string } | null
  assigned_to?: { id: string; full_name: string | null } | null
}

interface ClientOption {
  id: string
  name: string
}

interface LocationOption {
  id: string
  name: string
  client_id: string
}

interface UserOption {
  id: string
  full_name: string | null
}

const TYPE_LABELS: Record<string, string> = {
  citations: 'Citations',
  gmb: 'GMB',
  reviews: 'Reviews',
  content: 'Content',
  technical: 'Technical',
  ai_visibility: 'AI Visibility',
  other: 'Other',
}
const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  doing: 'Doing',
  blocked: 'Blocked',
  done: 'Done',
}
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

interface TaskListClientProps {
  initialTasks: TaskWithRelations[]
  clients: ClientOption[]
  locations: LocationOption[]
  users: UserOption[]
  /** Pre-scope to client (e.g. from client detail page) */
  scopeClientId?: string
  /** Pre-scope to location (e.g. from location Tasks link) */
  scopeLocationId?: string
  /** Initial filter from URL (client_id, location_id) */
  initialFilterClientId?: string
  initialFilterLocationId?: string
  readOnly?: boolean
  title?: string
}

export function TaskListClient({
  initialTasks,
  clients,
  locations,
  users,
  scopeClientId,
  scopeLocationId,
  initialFilterClientId,
  initialFilterLocationId,
  readOnly = false,
  title = 'Tasks',
}: TaskListClientProps) {
  const [tasks, setTasks] = useState<TaskWithRelations[]>(initialTasks)
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(Boolean(initialFilterClientId || initialFilterLocationId))
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [commentsOpenId, setCommentsOpenId] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, { id: string; comment: string; created_at: string; user?: { full_name: string | null } }[]>>({})
  const [newComment, setNewComment] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [filters, setFilters] = useState({
    client_id: initialFilterClientId ?? scopeClientId ?? '',
    location_id: initialFilterLocationId ?? scopeLocationId ?? '',
    status: '',
    priority: '',
    assigned_to_user_id: '',
  })
  const [form, setForm] = useState({
    client_id: scopeClientId ?? '',
    location_id: '',
    title: '',
    description: '',
    type: 'other' as TaskType,
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    due_date: '',
    assigned_to_user_id: '',
    is_client_visible: false,
  })
  const [patchForm, setPatchForm] = useState<Partial<typeof form>>({})

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.client_id) params.set('client_id', filters.client_id)
      if (filters.location_id) params.set('location_id', filters.location_id)
      if (filters.status) params.set('status', filters.status)
      if (filters.priority) params.set('priority', filters.priority)
      if (filters.assigned_to_user_id) params.set('assigned_to_user_id', filters.assigned_to_user_id)
      const res = await fetch(`/api/tasks?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks ?? [])
      }
    } catch (e) {
      console.error('Failed to fetch tasks', e)
    } finally {
      setLoading(false)
    }
  }, [filters.client_id, filters.location_id, filters.status, filters.priority, filters.assigned_to_user_id])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const clientLocations = form.client_id
    ? locations.filter((l) => l.client_id === form.client_id)
    : []

  async function createTask(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.client_id) return
    setLoading(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: form.client_id,
          location_id: form.location_id || null,
          title: form.title.trim(),
          description: form.description.trim() || null,
          type: form.type,
          status: form.status,
          priority: form.priority,
          due_date: form.due_date || null,
          assigned_to_user_id: form.assigned_to_user_id || null,
          is_client_visible: form.is_client_visible,
        }),
      })
      if (res.ok) {
        setShowForm(false)
        setForm({ ...form, title: '', description: '', location_id: '', due_date: '' })
        fetchTasks()
      } else {
        const err = await res.json()
        alert(err.error ?? 'Failed to create task')
      }
    } finally {
      setLoading(false)
    }
  }

  async function updateTask(taskId: string) {
    const payload: Record<string, unknown> = { ...patchForm }
    if (payload.due_date === '') payload.due_date = null
    if (payload.assigned_to_user_id === '') payload.assigned_to_user_id = null
    if (payload.location_id === '') payload.location_id = null
    if (Object.keys(payload).length === 0) {
      setEditingId(null)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setEditingId(null)
        setPatchForm({})
        fetchTasks()
      } else {
        const err = await res.json()
        alert(err.error ?? 'Failed to update')
      }
    } finally {
      setLoading(false)
    }
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Delete this task?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId))
      } else {
        const err = await res.json()
        alert(err.error ?? 'Failed to delete')
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadComments(taskId: string) {
    if (comments[taskId] !== undefined) return
    const res = await fetch(`/api/tasks/${taskId}/comments`)
    if (res.ok) {
      const data = await res.json()
      setComments((prev) => ({ ...prev, [taskId]: data.comments ?? [] }))
    }
  }

  function openComments(taskId: string) {
    setCommentsOpenId(commentsOpenId === taskId ? null : taskId)
    setNewComment('')
    if (commentsOpenId !== taskId) loadComments(taskId)
  }

  async function submitComment(taskId: string) {
    if (!newComment.trim()) return
    setCommentSubmitting(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment.trim() }),
      })
      if (res.ok) {
        setNewComment('')
        loadComments(taskId)
      } else {
        const err = await res.json()
        alert(err.error ?? 'Failed to add comment')
      }
    } finally {
      setCommentSubmitting(false)
    }
  }

  const filteredLocations = scopeClientId ? locations.filter((l) => l.client_id === scopeClientId) : locations

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle>{title}</CardTitle>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--accent-muted)]"
              >
                <Filter className="h-4 w-4" />
                Filters
                <ChevronDown className={showFilters ? 'rotate-180' : ''} />
              </button>
              <button
                type="button"
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </button>
            </div>
          )}
        </div>

        {showFilters && (
          <div className="mt-4 flex flex-wrap gap-4 rounded-lg border border-[var(--card-border)] p-4">
            <select
              value={filters.client_id}
              onChange={(e) => setFilters((f) => ({ ...f, client_id: e.target.value }))}
              className="rounded border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm"
            >
              <option value="">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={filters.location_id}
              onChange={(e) => setFilters((f) => ({ ...f, location_id: e.target.value }))}
              className="rounded border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm"
            >
              <option value="">All locations</option>
              {filteredLocations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="rounded border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm"
            >
              <option value="">Any status</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
              className="rounded border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm"
            >
              <option value="">Any priority</option>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={filters.assigned_to_user_id}
              onChange={(e) => setFilters((f) => ({ ...f, assigned_to_user_id: e.target.value }))}
              className="rounded border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm"
            >
              <option value="">Any assignee</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name || u.id.slice(0, 8)}</option>
              ))}
            </select>
          </div>
        )}

        {showForm && !readOnly && (
          <form onSubmit={createTask} className="mt-4 space-y-3 rounded-lg border border-[var(--card-border)] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Client *</label>
                <select
                  required
                  value={form.client_id}
                  onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value, location_id: '' }))}
                  className="w-full rounded border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm"
                >
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Location</label>
                <select
                  value={form.location_id}
                  onChange={(e) => setForm((f) => ({ ...f, location_id: e.target.value }))}
                  className="w-full rounded border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm"
                >
                  <option value="">None</option>
                  {clientLocations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-[var(--muted)]">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm"
                placeholder="Task title"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[var(--muted)]">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm"
                rows={2}
                placeholder="Optional description"
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TaskType }))}
                  className="rounded border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm"
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))}
                  className="rounded border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm"
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
                  className="rounded border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm"
                >
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Due date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="rounded border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Assignee</label>
                <select
                  value={form.assigned_to_user_id}
                  onChange={(e) => setForm((f) => ({ ...f, assigned_to_user_id: e.target.value }))}
                  className="rounded border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name || u.id.slice(0, 8)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_client_visible"
                checked={form.is_client_visible}
                onChange={(e) => setForm((f) => ({ ...f, is_client_visible: e.target.checked }))}
              />
              <label htmlFor="is_client_visible" className="text-sm text-[var(--muted)]">
                Visible to client in portal
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Task'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </CardHeader>

      <div className="px-6 pb-6">
        {loading && tasks.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--muted)]" />
          </div>
        ) : tasks.length === 0 ? (
          <p className="py-8 text-center text-[var(--muted)]">No tasks match your filters.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-lg border border-[var(--card-border)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {editingId === task.id ? (
                      <div className="space-y-2">
                        <input
                          value={patchForm.title ?? task.title}
                          onChange={(e) => setPatchForm((f) => ({ ...f, title: e.target.value }))}
                          className="w-full rounded border border-[var(--card-border)] bg-[var(--card)] px-2 py-1 text-sm"
                        />
                        <div className="flex flex-wrap gap-2">
                          <select
                            value={patchForm.status ?? task.status}
                            onChange={(e) => setPatchForm((f) => ({ ...f, status: e.target.value as TaskStatus }))}
                            className="rounded border border-[var(--card-border)] bg-[var(--card)] px-2 py-1 text-sm"
                          >
                            {Object.entries(STATUS_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                          <select
                            value={patchForm.priority ?? task.priority}
                            onChange={(e) => setPatchForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
                            className="rounded border border-[var(--card-border)] bg-[var(--card)] px-2 py-1 text-sm"
                          >
                            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => updateTask(task.id)}
                            className="rounded bg-[var(--accent)] px-2 py-1 text-sm text-white"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingId(null); setPatchForm({}) }}
                            className="rounded border border-[var(--card-border)] px-2 py-1 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-[var(--foreground)]">{task.title}</span>
                          <span className="rounded bg-[var(--accent-muted)] px-2 py-0.5 text-xs text-[var(--foreground)]">
                            {STATUS_LABELS[task.status]}
                          </span>
                          <span className="rounded px-2 py-0.5 text-xs text-[var(--muted)]">
                            {PRIORITY_LABELS[task.priority]}
                          </span>
                          <span className="rounded px-2 py-0.5 text-xs text-[var(--muted)]">
                            {TYPE_LABELS[task.type]}
                          </span>
                          {task.is_client_visible && (
                            <span className="flex items-center gap-1 text-xs text-[var(--muted)]" title="Visible to client">
                              <Eye className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        {(task.client?.name || task.location?.name || task.due_date || task.assigned_to) && (
                          <div className="mt-1 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                            {task.client?.name && (
                              <span className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {task.client.name}
                              </span>
                            )}
                            {task.location?.name && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {task.location.name}
                              </span>
                            )}
                            {task.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                            {task.assigned_to && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {task.assigned_to.full_name || 'Assigned'}
                              </span>
                            )}
                          </div>
                        )}
                        {task.description && (
                          <p className="mt-1 text-sm text-[var(--muted)]">{task.description}</p>
                        )}
                      </>
                    )}
                  </div>
                  {!readOnly && editingId !== task.id && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openComments(task.id)}
                        className="rounded p-2 text-[var(--muted)] hover:bg-[var(--accent-muted)]"
                        title="Comments"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingId(task.id); setPatchForm({}) }}
                        className="rounded p-2 text-[var(--muted)] hover:bg-[var(--accent-muted)]"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTask(task.id)}
                        className="rounded p-2 text-[var(--danger)] hover:bg-[var(--danger-muted)]/30"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                {commentsOpenId === task.id && (
                  <div className="mt-3 border-t border-[var(--card-border)] pt-3">
                    <p className="mb-2 text-sm font-medium text-[var(--muted)]">Comments</p>
                    {(comments[task.id] ?? []).length === 0 ? (
                      <p className="text-sm text-[var(--muted)]">No comments yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {(comments[task.id] ?? []).map((c) => (
                          <li key={c.id} className="text-sm">
                            <span className="text-[var(--muted)]">{c.user?.full_name ?? 'User'}: </span>
                            {c.comment}
                            <span className="ml-2 text-xs text-[var(--muted)]">
                              {new Date(c.created_at).toLocaleString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {!readOnly && (
                      <div className="mt-3 flex gap-2">
                        <input
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          className="min-w-0 flex-1 rounded border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm"
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submitComment(task.id)}
                        />
                        <button
                          type="button"
                          disabled={!newComment.trim() || commentSubmitting}
                          onClick={() => submitComment(task.id)}
                          className="rounded bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                          {commentSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
