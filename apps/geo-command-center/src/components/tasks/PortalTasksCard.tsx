'use client'

import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Calendar, MapPin, CheckSquare } from 'lucide-react'
import type { TaskWithRelations } from './TaskListClient'

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  doing: 'In Progress',
  blocked: 'Blocked',
  done: 'Done',
}
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
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

interface PortalTasksCardProps {
  tasks: TaskWithRelations[]
}

export function PortalTasksCard({ tasks }: PortalTasksCardProps) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Tasks from your agency
          </CardTitle>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Your agency may share tasks with you here. There are no tasks visible to you right now.
          </p>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Tasks from your agency
        </CardTitle>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Read-only view of tasks your agency has shared with you.
        </p>
      </CardHeader>
      <div className="px-6 pb-6">
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="rounded-lg border border-[var(--card-border)] p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-[var(--foreground)]">{task.title}</span>
                <span className="rounded bg-[var(--accent-muted)] px-2 py-0.5 text-xs text-[var(--foreground)]">
                  {STATUS_LABELS[task.status] ?? task.status}
                </span>
                <span className="text-xs text-[var(--muted)]">{PRIORITY_LABELS[task.priority]}</span>
                <span className="text-xs text-[var(--muted)]">{TYPE_LABELS[task.type]}</span>
              </div>
              {(task.location?.name || task.due_date) && (
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                  {task.location?.name && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {task.location.name}
                    </span>
                  )}
                  {task.due_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
              {task.description && (
                <p className="mt-2 text-sm text-[var(--muted)]">{task.description}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
