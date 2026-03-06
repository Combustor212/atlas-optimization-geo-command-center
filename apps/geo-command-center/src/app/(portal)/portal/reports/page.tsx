import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { ReportHistoryClient } from './ReportHistoryClient'
import Link from 'next/link'

export default async function PortalReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('client_id')
    .eq('id', user.id)
    .single()

  if (!profile?.client_id) redirect('/dashboard')

  const { data: runs } = await supabase
    .from('report_runs')
    .select('id, status, summary, run_at, created_at')
    .eq('client_id', profile.client_id)
    .in('status', ['generated', 'sent'])
    .order('run_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/portal"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ← Back to overview
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-[var(--foreground)]">Report History</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Download your performance reports
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Reports</CardTitle>
        </CardHeader>
        <ReportHistoryClient runs={runs ?? []} />
      </Card>
    </div>
  )
}
