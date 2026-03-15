import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { getLeadById } from '@/lib/data/leads'
import { Card, CardContent } from '@/components/ui/Card'
import { ArrowLeft } from 'lucide-react'
import { ScanReportEmbed } from './ScanReportEmbed'

export const dynamic = 'force-dynamic'

export default async function ScanReportPage({
  params,
}: {
  params: Promise<{ leadId: string }>
}) {
  const { leadId } = await params
  const currentUser = await getCurrentUserAgency()
  const { agencyId, role } = currentUser || {}

  if (!agencyId) redirect('/login')
  if (role !== 'admin') redirect('/dashboard')

  const lead = await getLeadById(leadId)
  if (!lead || lead.source !== 'scan') notFound()

  const meta = (lead.metadata || {}) as Record<string, unknown>
  const scanReport = meta.scanReport as Record<string, unknown> | undefined

  return (
    <div className="p-4 sm:p-8 w-full max-w-full overflow-hidden">
      <Link
        href="/dashboard/leads"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Leads
      </Link>

      <div className="mb-6">
        <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">
          Admin View — Full Scan Report
        </p>
        <p className="text-sm text-[var(--muted)]">
          This is the exact report the business saw when they ran the scan. All sections are visible (no blur).
        </p>
      </div>

      {scanReport ? (
        <ScanReportEmbed
          lead={lead}
          scanReport={scanReport}
        />
      ) : (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-12 text-center">
            <p className="text-[var(--foreground)] font-medium mb-2">
              No stored scan report for this lead
            </p>
            <p className="text-sm text-[var(--muted)] mb-4">
              Scan reports are stored for leads created after the update. This lead was created before full report storage.
            </p>
            <div className="flex flex-wrap gap-2 justify-center text-sm">
              <span className="rounded bg-[var(--accent-muted)] px-2 py-1">
                {lead.business_name || lead.name}
              </span>
              <span className="rounded bg-[var(--accent-muted)] px-2 py-1">
                {meta.meoScore != null && `MEO ${meta.meoScore}`}
              </span>
              <span className="rounded bg-[var(--accent-muted)] px-2 py-1">
                {meta.geoScore != null && `GEO ${meta.geoScore}`}
              </span>
              <span className="rounded bg-[var(--accent-muted)] px-2 py-1">
                {meta.overallScore != null && `Overall ${meta.overallScore}`}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
