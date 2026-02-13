import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, getDaysRemaining } from '@/lib/utils'
import { Building2, Receipt, FileText, CheckSquare } from 'lucide-react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

async function getDashboardData() {
  const now = new Date()
  const thirtyDaysFromNow = new Date(now)
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  const sevenDaysFromNow = new Date(now)
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

  // Get active clients count
  const activeClientsCount = await prisma.business.count({
    where: { status: 'ACTIVE' },
  })

  // Get overdue invoices
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['SENT', 'OVERDUE'] },
      dueDate: { lt: now },
    },
    include: {
      business: true,
    },
    orderBy: { dueDate: 'asc' },
  })

  const overdueAmount = overdueInvoices.reduce(
    (sum, inv) => sum + inv.amountCents,
    0
  )

  // Get expiring contracts
  const expiringContracts = await prisma.contract.findMany({
    where: {
      status: 'ACTIVE',
      endDate: {
        gte: now,
        lte: thirtyDaysFromNow,
      },
    },
    include: {
      business: true,
    },
    orderBy: { endDate: 'asc' },
  })

  // Get upcoming tasks
  const upcomingTasks = await prisma.workItem.findMany({
    where: {
      status: { in: ['TODO', 'IN_PROGRESS'] },
      dueDate: {
        gte: now,
        lte: sevenDaysFromNow,
      },
    },
    include: {
      business: true,
      assignedTo: true,
    },
    orderBy: { dueDate: 'asc' },
    take: 10,
  })

  return {
    activeClientsCount,
    overdueInvoicesCount: overdueInvoices.length,
    overdueAmount,
    expiringContractsCount: expiringContracts.length,
    upcomingTasksCount: upcomingTasks.length,
    overdueInvoices,
    expiringContracts,
    upcomingTasks,
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your agency operations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeClientsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data.overdueInvoicesCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(data.overdueAmount)} overdue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {data.expiringContractsCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Contracts in 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {data.upcomingTasksCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Due in 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Contracts */}
      {data.expiringContracts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expiring Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days Remaining</TableHead>
                  <TableHead>MRR</TableHead>
                  <TableHead>Auto Renew</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.expiringContracts.map((contract) => {
                  const daysRemaining = getDaysRemaining(contract.endDate)
                  return (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/businesses/${contract.businessId}`}
                          className="hover:underline"
                        >
                          {contract.business.name}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(contract.endDate)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={daysRemaining <= 14 ? 'destructive' : 'outline'}
                        >
                          {daysRemaining} days
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(contract.mrr)}</TableCell>
                      <TableCell>
                        {contract.autoRenew ? (
                          <Badge variant="secondary">Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/contracts/${contract.id}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Overdue Invoices */}
      {data.overdueInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Overdue Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.overdueInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/businesses/${invoice.businessId}`}
                        className="hover:underline"
                      >
                        {invoice.business.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-red-600">
                      {formatDate(invoice.dueDate)}
                    </TableCell>
                    <TableCell>{formatCurrency(invoice.amountCents)}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">OVERDUE</Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Tasks */}
      {data.upcomingTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.upcomingTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="hover:underline"
                      >
                        {task.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/businesses/${task.businessId}`}
                        className="hover:underline text-sm"
                      >
                        {task.business.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{task.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {task.assignedTo?.name || 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          task.status === 'IN_PROGRESS'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {task.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

