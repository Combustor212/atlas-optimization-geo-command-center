import { prisma } from '@/lib/db'
import { ContractForm } from '@/components/forms/contract-form'
import { Card, CardContent } from '@/components/ui/card'

export default async function NewContractPage() {
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
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Create New Contract</h1>
        <p className="text-slate-500 mt-1">Set up a new service contract</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ContractForm businesses={businesses} deals={deals} />
        </CardContent>
      </Card>
    </div>
  )
}
