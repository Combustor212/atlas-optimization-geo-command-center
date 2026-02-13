import { prisma } from '@/lib/db'
import { TaskForm } from '@/components/forms/task-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function NewTaskPage() {
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
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Create New Task</h1>
        <p className="text-slate-500 mt-1">Add a new work item or deliverable</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <TaskForm businesses={businesses} contracts={contracts} users={users} />
        </CardContent>
      </Card>
    </div>
  )
}
