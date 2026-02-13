import { prisma } from '@/lib/db'
import { DealsPipeline } from '@/components/deals/deals-pipeline'

export default async function DealsPage() {
  const deals = await prisma.deal.findMany({
    include: {
      business: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Deals Pipeline</h1>
        <p className="text-slate-500 mt-1">Track deals through your sales pipeline</p>
      </div>

      <DealsPipeline deals={deals} />
    </div>
  )
}

