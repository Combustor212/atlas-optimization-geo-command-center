import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Calendar, User, Building2, FileText, CheckSquare } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const task = await prisma.workItem.findUnique({
    where: { id: params.id },
    include: {
      business: true,
      contract: true,
      assignedTo: true,
    },
  })

  if (!task) {
    notFound()
  }

  let checklist = null
  if (task.checklist) {
    try {
      checklist = JSON.parse(task.checklist)
    } catch (e) {
      // Invalid JSON, ignore
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/tasks">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{task.category}</Badge>
            <Badge variant={task.status === 'DONE' ? 'default' : 'secondary'}>
              {task.status}
            </Badge>
            <Badge
              variant={
                task.priority === 'HIGH'
                  ? 'destructive'
                  : task.priority === 'MEDIUM'
                  ? 'outline'
                  : 'secondary'
              }
            >
              {task.priority}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{task.title}</h1>
          <p className="text-slate-500 mt-1">Task Details</p>
        </div>
        <Link href={`/tasks/${task.id}/edit`}>
          <Button>Edit Task</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Business
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/businesses/${task.businessId}`}
              className="text-lg font-semibold hover:underline"
            >
              {task.business.name}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Assigned To
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {task.assignedTo?.name || 'Unassigned'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Due Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Related Contract
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {task.contract ? (
                <Link href={`/contracts`} className="hover:underline">
                  {new Date(task.contract.startDate).toLocaleDateString()} -{' '}
                  {new Date(task.contract.endDate).toLocaleDateString()}
                </Link>
              ) : (
                'None'
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {task.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 whitespace-pre-wrap">{task.description}</p>
          </CardContent>
        </Card>
      )}

      {checklist && Array.isArray(checklist) && checklist.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {checklist.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.done}
                    readOnly
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span
                    className={
                      item.done ? 'text-slate-500 line-through' : 'text-slate-900'
                    }
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Created:</span>
              <span className="font-medium">{formatDate(task.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Last Updated:</span>
              <span className="font-medium">{formatDate(task.updatedAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
