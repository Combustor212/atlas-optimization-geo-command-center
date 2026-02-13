import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { InvoiceForm } from '@/components/forms/invoice-form'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function EditInvoicePage({ params }: { params: { id: string } }) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
  })

  if (!invoice) {
    notFound()
  }

  // Get all businesses and active contracts for the form
  const [businesses, contracts] = await Promise.all([
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
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/invoices">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Edit Invoice</h1>
        <p className="text-slate-500 mt-1">Update invoice details</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <InvoiceForm invoice={invoice} businesses={businesses} contracts={contracts} />
        </CardContent>
      </Card>
    </div>
  )
}
