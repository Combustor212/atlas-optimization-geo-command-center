import { redirect } from 'next/navigation'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { getAllLeadsForAdmin, type Lead } from '@/lib/data/leads'

export const dynamic = 'force-dynamic'
import { Card } from '@/components/ui/Card'
import { LeadFollowUpStatusSelect } from '@/components/leads/LeadFollowUpStatusSelect'
import { DeleteLeadButton } from '@/components/leads/DeleteLeadButton'
import { MessagePreview } from '@/components/leads/MessagePreview'
import { MessageSquare, Calendar, Mail, Phone, Building2, Search } from 'lucide-react'
import { format } from 'date-fns'

const PREFERRED_LABELS: Record<string, string> = {
  morning: 'Morning (9am - 12pm)',
  afternoon: 'Afternoon (12pm - 3pm)',
  evening: 'Evening (3pm - 6pm)',
  flexible: 'Flexible',
}

/** Format the date/time the business requested for the call (not when they submitted the form). */
function formatRequestedCallDateTime(lead: Lead): string {
  // 1. scheduled_at = full datetime from calendar booking
  if (lead.scheduled_at) {
    try {
      const d = new Date(lead.scheduled_at)
      if (!isNaN(d.getTime())) return format(d, 'MMM d, yyyy \'at\' h:mm a')
    } catch {
      return lead.scheduled_at
    }
  }
  // 2. preferred_date + preferred_time = fallback form (date picker + time text)
  if (lead.preferred_date) {
    const pt = lead.preferred_time
    const timePart = pt ? (PREFERRED_LABELS[pt] || pt) : null
    try {
      const d = new Date(lead.preferred_date)
      if (!isNaN(d.getTime())) {
        return timePart ? `${format(d, 'MMM d, yyyy')} at ${timePart}` : format(d, 'MMM d, yyyy')
      }
    } catch {
      return timePart ? `${lead.preferred_date} at ${timePart}` : lead.preferred_date
    }
  }
  // 3. preferred_time only (ISO from calendar, or free text like "6pm")
  if (lead.preferred_time) {
    const isoMatch = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.exec(lead.preferred_time)
    if (isoMatch) {
      try {
        const d = new Date(lead.preferred_time)
        if (!isNaN(d.getTime())) return format(d, 'MMM d, yyyy \'at\' h:mm a')
      } catch {
        return lead.preferred_time
      }
    }
    const label = PREFERRED_LABELS[lead.preferred_time] || lead.preferred_time
    return lead.timezone ? `${label} ${lead.timezone}` : label
  }
  return '—'
}

function formatPreferredTime(preferredTime: string | null, timezone: string | null): string {
  if (!preferredTime) return '—'
  const label = PREFERRED_LABELS[preferredTime] || preferredTime
  const isoMatch = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.exec(preferredTime)
  if (isoMatch) {
    try {
      const d = new Date(preferredTime)
      if (!isNaN(d.getTime())) return format(d, 'MMM d, yyyy \'at\' h:mm a')
    } catch {
      /* fall through */
    }
  }
  return timezone ? `${label} ${timezone}` : label
}

function LeadRow({ lead }: { lead: Lead }) {
  return (
    <tr className="border-b border-[var(--card-border)] last:border-0 transition-colors hover:bg-[var(--accent-muted)]/30">
      <td className="px-6 py-4">
        <div>
          <p className="font-medium text-[var(--foreground)]">{lead.name}</p>
          <p className="text-sm text-[var(--muted)] flex items-center gap-1 mt-0.5">
            <Mail className="h-3.5 w-3.5" />
            <a href={`mailto:${lead.email}`} className="hover:text-[var(--accent)]">
              {lead.email}
            </a>
          </p>
        </div>
      </td>
      <td className="px-6 py-4">
        {lead.business_name ? (
          <span className="text-sm flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-[var(--muted)]" />
            {lead.business_name}
          </span>
        ) : (
          <span className="text-sm text-[var(--muted)]">—</span>
        )}
      </td>
      <td className="px-6 py-4">
        <MessagePreview message={lead.message} />
      </td>
      <td className="px-6 py-4 text-sm text-[var(--muted)]">
        {format(new Date(lead.created_at), 'MMM d, yyyy h:mm a')}
      </td>
      <td className="px-6 py-4">
        <DeleteLeadButton leadId={lead.id} />
      </td>
    </tr>
  )
}

function ScheduledCallRow({ lead }: { lead: Lead }) {
  return (
    <tr className="border-b border-[var(--card-border)] last:border-0 transition-colors hover:bg-[var(--accent-muted)]/30">
      <td className="px-6 py-4">
        <div>
          <p className="font-medium text-[var(--foreground)]">{lead.name}</p>
          <p className="text-sm text-[var(--muted)] flex items-center gap-1 mt-0.5">
            <Mail className="h-3.5 w-3.5" />
            <a href={`mailto:${lead.email}`} className="hover:text-[var(--accent)]">
              {lead.email}
            </a>
          </p>
        </div>
      </td>
      <td className="px-6 py-4">
        {lead.phone ? (
          <a href={`tel:${lead.phone}`} className="text-sm text-[var(--muted)] hover:text-[var(--accent)] flex items-center gap-1">
            <Phone className="h-3.5 w-3.5" />
            {lead.phone}
          </a>
        ) : (
          <span className="text-sm text-[var(--muted)]">—</span>
        )}
      </td>
      <td className="px-6 py-4">
        {lead.business_name ? (
          <span className="text-sm flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-[var(--muted)]" />
            {lead.business_name}
          </span>
        ) : (
          <span className="text-sm text-[var(--muted)]">—</span>
        )}
      </td>
      <td className="px-6 py-4">
        <span className="text-sm font-medium text-[var(--foreground)]">
          {formatRequestedCallDateTime(lead)}
        </span>
      </td>
      <td className="px-6 py-4">
        <MessagePreview message={lead.message} />
      </td>
      <td className="px-6 py-4 text-sm text-[var(--muted)]">
        {format(new Date(lead.created_at), 'MMM d, yyyy h:mm a')}
      </td>
      <td className="px-6 py-4">
        <LeadFollowUpStatusSelect
          leadId={lead.id}
          value={lead.follow_up_status}
        />
      </td>
      <td className="px-6 py-4">
        <DeleteLeadButton leadId={lead.id} />
      </td>
    </tr>
  )
}

function ScanLeadRow({ lead }: { lead: Lead }) {
  const meta = (lead.metadata || {}) as Record<string, unknown>
  const city = meta.city as string | undefined
  const state = meta.state as string | undefined
  const country = meta.country as string | undefined
  const address = meta.address as string | undefined
  const meoScore = meta.meoScore as number | undefined
  const seoScore = meta.seoScore as number | undefined
  const geoScore = meta.geoScore as number | undefined
  const overallScore = meta.overallScore as number | undefined
  const locationStr = [city, state, country].filter(Boolean).join(', ') || address || '—'

  return (
    <tr className="border-b border-[var(--card-border)] last:border-0 transition-colors hover:bg-[var(--accent-muted)]/30">
      <td className="px-6 py-4">
        <div>
          <p className="font-medium text-[var(--foreground)]">{lead.business_name || lead.name}</p>
          <p className="text-sm text-[var(--muted)] flex items-center gap-1 mt-0.5">
            <Mail className="h-3.5 w-3.5" />
            <a href={`mailto:${lead.email}`} className="hover:text-[var(--accent)]">
              {lead.email}
            </a>
          </p>
        </div>
      </td>
      <td className="px-6 py-4">
        {lead.phone ? (
          <a href={`tel:${lead.phone}`} className="text-sm text-[var(--muted)] hover:text-[var(--accent)] flex items-center gap-1">
            <Phone className="h-3.5 w-3.5" />
            {lead.phone}
          </a>
        ) : (
          <span className="text-sm text-[var(--muted)]">—</span>
        )}
      </td>
      <td className="px-6 py-4">
        <span className="text-sm text-[var(--muted)]">{locationStr}</span>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-1.5 text-xs">
          {typeof meoScore === 'number' && <span className="rounded bg-[var(--accent-muted)] px-1.5 py-0.5">MEO {meoScore}</span>}
          {typeof seoScore === 'number' && <span className="rounded bg-[var(--accent-muted)] px-1.5 py-0.5">SEO {seoScore}</span>}
          {typeof geoScore === 'number' && <span className="rounded bg-[var(--accent-muted)] px-1.5 py-0.5">GEO {geoScore}</span>}
          {typeof overallScore === 'number' && <span className="rounded bg-[var(--accent)]/20 px-1.5 py-0.5 font-medium">Overall {overallScore}</span>}
          {meoScore === undefined && seoScore === undefined && geoScore === undefined && overallScore === undefined && <span className="text-[var(--muted)]">—</span>}
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-[var(--muted)]">
        {format(new Date(lead.created_at), 'MMM d, yyyy h:mm a')}
      </td>
      <td className="px-6 py-4">
        <DeleteLeadButton leadId={lead.id} />
      </td>
    </tr>
  )
}

export default async function LeadsPage() {
  const currentUser = await getCurrentUserAgency()
  const { agencyId, role } = currentUser || {}

  if (!agencyId) {
    redirect('/login')
  }

  // Only admins can access leads
  if (role !== 'admin') {
    redirect('/dashboard')
  }

  let scanLeads: Lead[] = []
  let scheduledCalls: Lead[] = []
  let messageLeads: Lead[] = []
  let setupRequired = false

  try {
    const leads = await getAllLeadsForAdmin(agencyId)
    scanLeads = leads.filter((l) => l.source === 'scan')
    scheduledCalls = leads.filter((l) => l.source === 'scheduled_call')
    messageLeads = leads.filter((l) => l.source === 'contact_form')
  } catch (err) {
    // Table may not exist yet - run supabase/migrations/20260229_leads.sql
    setupRequired = true
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Leads</h1>
        <p className="mt-1 text-[var(--muted)]">
          Scan leads, call requests, and messages from AGS
        </p>
      </div>

      {setupRequired && (
        <div className="mb-6 rounded-lg border border-[var(--warning)]/50 bg-[var(--warning-muted)]/30 p-4 text-[var(--foreground)]">
          <p className="font-medium">Setup required</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Run these migrations in Supabase SQL Editor (in order): <code className="rounded bg-[var(--card)] px-1.5 py-0.5 text-xs">20260229_leads.sql</code>, then <code className="rounded bg-[var(--card)] px-1.5 py-0.5 text-xs">20260305_leads_scan_source.sql</code>. Also set <code className="rounded bg-[var(--card)] px-1.5 py-0.5 text-xs">AGS_LEADS_API_KEY</code> and <code className="rounded bg-[var(--card)] px-1.5 py-0.5 text-xs">AGS_LEADS_AGENCY_SLUG</code> in Geo Command Center; <code className="rounded bg-[var(--card)] px-1.5 py-0.5 text-xs">AGS_LEADS_API_KEY</code> and <code className="rounded bg-[var(--card)] px-1.5 py-0.5 text-xs">GEO_COMMAND_CENTER_URL</code> in MGO backend.
          </p>
        </div>
      )}

      {/* Scan Leads - from when businesses run a free scan */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <Search className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="text-lg font-semibold text-[var(--foreground)]">From Scan</h2>
          <span className="text-sm text-[var(--muted)]">({scanLeads.length})</span>
        </div>
        <Card className="overflow-hidden p-0">
          {scanLeads.length === 0 ? (
            <div className="py-12 text-center text-[var(--muted)]">
              <Search className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-4">No scan leads yet</p>
              <p className="mt-1 text-sm">Leads from businesses who run a free scan on AGS will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-[var(--card-border)] bg-[var(--accent-muted)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Business / Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Scores
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Scanned
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)] w-12">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scanLeads.map((lead) => (
                    <ScanLeadRow key={lead.id} lead={lead} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Call Requests - from Book a Call */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <Calendar className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Call Requests</h2>
          <span className="text-sm text-[var(--muted)]">({scheduledCalls.length})</span>
        </div>
        <Card className="overflow-hidden p-0">
          {scheduledCalls.length === 0 ? (
            <div className="py-12 text-center text-[var(--muted)]">
              <Calendar className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-4">No call requests yet</p>
              <p className="mt-1 text-sm">Leads from the &quot;Book a Call&quot; form on AGS will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-[var(--card-border)] bg-[var(--accent-muted)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Name / Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Business
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Requested Call Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Form Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)] w-12">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledCalls.map((lead) => (
                    <ScheduledCallRow key={lead.id} lead={lead} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Message Leads - from Send us a message */}
      <div>
        <div className="mb-3 flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Messages</h2>
          <span className="text-sm text-[var(--muted)]">({messageLeads.length})</span>
        </div>
        <Card className="overflow-hidden p-0">
          {messageLeads.length === 0 ? (
            <div className="py-12 text-center text-[var(--muted)]">
              <MessageSquare className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-4">No messages yet</p>
              <p className="mt-1 text-sm">Leads from the &quot;Send us a message&quot; form on AGS will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-[var(--card-border)] bg-[var(--accent-muted)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Name / Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Business
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Message
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)] w-12">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {messageLeads.map((lead) => (
                    <LeadRow key={lead.id} lead={lead} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
