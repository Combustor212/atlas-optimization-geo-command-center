import { prisma } from '@/lib/db'
import { InvoiceForm } from '@/components/forms/invoice-form'
import { Card, CardContent } from '@/components/ui/card'
import { generateInvoiceNumber } from '@/app/actions/invoices'

export default async function NewInvoicePage() {
  // Generate next invoice number
  const invoiceNumber = await generateInvoiceNumber()

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
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Create New Invoice</h1>
        <p className="text-slate-500 mt-1">Generate a new invoice for a client</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <InvoiceForm 
            businesses={businesses} 
            contracts={contracts}
            invoiceNumber={invoiceNumber}
          />
        </CardContent>
      </Card>
    </div>
  )
}
