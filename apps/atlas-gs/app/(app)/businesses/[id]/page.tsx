import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { ArrowLeft, Plus, ExternalLink } from 'lucide-react'
import { formatCurrency, formatDate, getDaysRemaining } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'default'
    case 'LEAD':
      return 'secondary'
    case 'PROSPECT':
      return 'outline'
    case 'PAUSED':
      return 'outline'
    case 'CHURNED':
      return 'destructive'
    default:
      return 'secondary'
  }
}

export default async function BusinessDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const business = await prisma.business.findUnique({
    where: { id: params.id },
    include: {
      contracts: {
        orderBy: { createdAt: 'desc' },
      },
      invoices: {
        orderBy: { createdAt: 'desc' },
      },
      workItems: {
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: true,
        },
      },
      deals: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!business) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/businesses">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Businesses
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{business.name}</h1>
            <Badge variant={getStatusBadgeVariant(business.status)}>
              {business.status}
            </Badge>
          </div>
          {business.legalName && (
            <p className="text-slate-500 mt-1">{business.legalName}</p>
          )}
        </div>
        <Link href={`/businesses/${business.id}/edit`}>
          <Button variant="outline">Edit Business</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {business.primaryContactName && (
              <div>
                <span className="font-medium">Name:</span> {business.primaryContactName}
              </div>
            )}
            {business.primaryContactEmail && (
              <div>
                <span className="font-medium">Email:</span>{' '}
                <a
                  href={`mailto:${business.primaryContactEmail}`}
                  className="text-blue-600 hover:underline"
                >
                  {business.primaryContactEmail}
                </a>
              </div>
            )}
            {business.primaryContactPhone && (
              <div>
                <span className="font-medium">Phone:</span> {business.primaryContactPhone}
              </div>
            )}
            {business.website && (
              <div>
                <span className="font-medium">Website:</span>{' '}
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Link <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Business Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {business.industry && (
              <div>
                <span className="font-medium">Industry:</span> {business.industry}
              </div>
            )}
            {(business.city || business.state) && (
              <div>
                <span className="font-medium">Location:</span>{' '}
                {[business.city, business.state].filter(Boolean).join(', ')}
              </div>
            )}
            {business.address && (
              <div>
                <span className="font-medium">Address:</span> {business.address}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Contracts:</span> {business.contracts.length}
            </div>
            <div>
              <span className="font-medium">Invoices:</span> {business.invoices.length}
            </div>
            <div>
              <span className="font-medium">Tasks:</span> {business.workItems.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {business.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{business.notes}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="contracts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Contracts</h2>
            <Link href={`/contracts/new?businessId=${business.id}`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Contract
              </Button>
            </Link>
          </div>
          <Card>
            <CardContent className="pt-6">
              {business.contracts.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No contracts found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>MRR</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Days Left</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {business.contracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell>{formatDate(contract.startDate)}</TableCell>
                        <TableCell>{formatDate(contract.endDate)}</TableCell>
                        <TableCell>{contract.termMonths} months</TableCell>
                        <TableCell>{formatCurrency(contract.mrr)}/mo</TableCell>
                        <TableCell>
                          <Badge variant={contract.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {contract.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {contract.status === 'ACTIVE' ? (
                            <Badge variant={getDaysRemaining(contract.endDate) <= 30 ? 'destructive' : 'outline'}>
                              {getDaysRemaining(contract.endDate)} days
                            </Badge>
                          ) : '-'}
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
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Invoices</h2>
            <Link href={`/invoices/new?businessId=${business.id}`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Invoice
              </Button>
            </Link>
          </div>
          <Card>
            <CardContent className="pt-6">
              {business.invoices.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No invoices found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {business.invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell>{formatCurrency(invoice.amountCents)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              invoice.status === 'PAID'
                                ? 'default'
                                : invoice.status === 'OVERDUE'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {invoice.status}
                          </Badge>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Tasks</h2>
            <Link href={`/tasks/new?businessId=${business.id}`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </Link>
          </div>
          <Card>
            <CardContent className="pt-6">
              {business.workItems.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No tasks found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {business.workItems.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{task.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={task.status === 'DONE' ? 'default' : 'secondary'}>
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell className="text-sm">
                          {task.assignedTo?.name || 'Unassigned'}
                        </TableCell>
                        <TableCell>
                          {task.dueDate ? formatDate(task.dueDate) : '-'}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/tasks/${task.id}`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            View
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deals" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Deals</h2>
          </div>
          <Card>
            <CardContent className="pt-6">
              {business.deals.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No deals found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stage</TableHead>
                      <TableHead>Expected MRR</TableHead>
                      <TableHead>Setup Fee</TableHead>
                      <TableHead>Close Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {business.deals.map((deal) => (
                      <TableRow key={deal.id}>
                        <TableCell>
                          <Badge>{deal.stage}</Badge>
                        </TableCell>
                        <TableCell>
                          {deal.expectedMrr ? formatCurrency(deal.expectedMrr) : '-'}
                        </TableCell>
                        <TableCell>
                          {deal.expectedSetupFee ? formatCurrency(deal.expectedSetupFee) : '-'}
                        </TableCell>
                        <TableCell>
                          {deal.closeDate ? formatDate(deal.closeDate) : '-'}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/deals`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            View Pipeline
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

