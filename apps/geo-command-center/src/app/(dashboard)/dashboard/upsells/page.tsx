import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { getUpsellOpportunities, getUpsellTriggers } from '@/lib/data/upsells'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { RunUpsellEvaluationButton } from '@/components/upsells/RunUpsellEvaluationButton'
import { UpsellPipelineBoard } from '@/components/upsells/UpsellPipelineBoard'
import { TrendingUp } from 'lucide-react'

export default async function UpsellsPage() {
  const { agencyId } = (await getCurrentUserAgency()) || {}
  if (!agencyId) redirect('/login')

  const [opportunities, triggers] = await Promise.all([
    getUpsellOpportunities(agencyId),
    getUpsellTriggers(agencyId),
  ])

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--foreground)]">
            <TrendingUp className="h-7 w-7 text-[var(--accent)]" />
            Upsell Pipeline
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Internal opportunities based on performance thresholds. Clients cannot see this view.
          </p>
        </div>
        <RunUpsellEvaluationButton triggerCount={triggers.length} />
      </div>

      {triggers.length === 0 && (
        <Card className="mb-6 border-[var(--accent-muted)] bg-[var(--accent-muted)]/20">
          <CardHeader>
            <CardTitle className="text-base">No active triggers</CardTitle>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Add upsell triggers in the database to create performance-based opportunities. Triggers
              use conditions like avg_rank, calls_monthly, ai_visibility_score, or health_band.
            </p>
            <Link
              href="/dashboard/clients"
              className="mt-3 inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
            >
              View clients →
            </Link>
          </CardHeader>
        </Card>
      )}

      <UpsellPipelineBoard opportunities={opportunities} />
    </div>
  )
}
