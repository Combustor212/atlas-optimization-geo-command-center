import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Plus } from 'lucide-react'
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

export default async function BusinessesPage() {
  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          contracts: true,
          invoices: true,
          workItems: true,
        },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Businesses</h1>
          <p className="text-slate-500 mt-1">Manage your client businesses</p>
        </div>
        <Link href="/businesses/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Business
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Businesses ({businesses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contracts</TableHead>
                <TableHead>Invoices</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {businesses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No businesses found. Create your first business to get started.
                  </TableCell>
                </TableRow>
              ) : (
                businesses.map((business) => (
                  <TableRow key={business.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/businesses/${business.id}`}
                        className="hover:underline"
                      >
                        {business.name}
                      </Link>
                    </TableCell>
                    <TableCell>{business.industry || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {business.primaryContactName || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(business.status)}>
                        {business.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{business._count.contracts}</TableCell>
                    <TableCell>{business._count.invoices}</TableCell>
                    <TableCell>{business._count.workItems}</TableCell>
                    <TableCell>
                      <Link
                        href={`/businesses/${business.id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

