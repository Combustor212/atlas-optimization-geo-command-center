import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { TaskForm } from '@/components/forms/task-form'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function EditTaskPage({ params }: { params: { id: string } }) {
  const task = await prisma.workItem.findUnique({
    where: { id: params.id },
  })

  if (!task) {
    notFound()
  }

  // Get all businesses, contracts, and users for the form
  const [businesses, contracts, users] = await Promise.all([
    prisma.business.findMany({
      orderBy: { name: 'asc' },
    }),
    prisma.contract.findMany({
      where: { status: 'ACTIVE' },
      include: {
        business: true,
      },
      orderBy: { startDate: 'desc' },
    }),
    prisma.user.findMany({
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/tasks/${task.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Task
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Edit Task</h1>
        <p className="text-slate-500 mt-1">Update task details</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <TaskForm task={task} businesses={businesses} contracts={contracts} users={users} />
        </CardContent>
      </Card>
    </div>
  )
}
