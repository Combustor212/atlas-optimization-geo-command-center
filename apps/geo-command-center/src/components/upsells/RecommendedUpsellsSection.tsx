import Link from 'next/link'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { TrendingUp } from 'lucide-react'
import { getUpsellOpportunities } from '@/lib/data/upsells'

const OFFER_LABELS: Record<string, string> = {
  ads: 'Ads',
  cro: 'CRO',
  content: 'Content',
  reputation: 'Reputation',
  ai_pr: 'AI PR',
  other: 'Other',
}

interface RecommendedUpsellsSectionProps {
  agencyId: string
  clientId: string
}

export async function RecommendedUpsellsSection({
  agencyId,
  clientId,
}: RecommendedUpsellsSectionProps) {
  const opportunities = await getUpsellOpportunities(agencyId, {
    clientId,
    status: 'open',
  })

  if (opportunities.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[var(--accent)]" />
            <CardTitle>Recommended Upsells</CardTitle>
          </div>
          <Link
            href="/dashboard/upsells"
            className="text-sm font-medium text-[var(--accent)] hover:underline"
          >
            View pipeline →
          </Link>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Internal opportunities for this client based on performance
        </p>
      </CardHeader>
      <ul className="space-y-2">
        {opportunities.map((opp) => (
          <li
            key={opp.id}
            className="flex items-center justify-between rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-3 text-sm"
          >
            <div>
              <span className="font-medium text-[var(--foreground)]">
                {opp.trigger?.name ?? 'Upsell'}
              </span>
              <span className="ml-2 text-xs text-[var(--muted)]">
                {opp.trigger ? OFFER_LABELS[opp.trigger.offer_type] ?? opp.trigger.offer_type : ''}
              </span>
              {opp.location_name && (
                <p className="mt-0.5 text-xs text-[var(--muted)]">Location: {opp.location_name}</p>
              )}
            </div>
            <Link
              href="/dashboard/upsells"
              className="rounded border border-[var(--card-border)] px-2 py-1 text-xs hover:bg-[var(--accent-muted)]"
            >
              Manage
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
