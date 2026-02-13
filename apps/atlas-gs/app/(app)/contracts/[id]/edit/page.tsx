import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { ContractForm } from '@/components/forms/contract-form'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function EditContractPage({ params }: { params: { id: string } }) {
  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
  })

  if (!contract) {
    notFound()
  }

  // Get all businesses and deals for the form
  const [businesses, deals] = await Promise.all([
    prisma.business.findMany({
      orderBy: { name: 'asc' },
    }),
    prisma.deal.findMany({
      where: { stage: { in: ['PROPOSAL', 'NEGOTIATION', 'WON'] } },
      include: {
        business: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/contracts">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contracts
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Edit Contract</h1>
        <p className="text-slate-500 mt-1">Update contract details</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ContractForm contract={contract} businesses={businesses} deals={deals} />
        </CardContent>
      </Card>
    </div>
  )
}
