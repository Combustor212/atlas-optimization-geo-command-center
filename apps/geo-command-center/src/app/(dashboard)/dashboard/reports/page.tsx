import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReportsAdminClient } from './ReportsAdminClient'

export default async function ReportsAdminPage() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, agency_id')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'staff') {
      redirect('/dashboard')
    }

    const [templatesRes, schedulesRes, clientsRes] = await Promise.all([
      supabase.from('report_templates').select('*').order('name'),
      supabase
        .from('report_schedules')
        .select('*, report_templates(name), clients(name)')
        .order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name').order('name'),
    ])

    if (templatesRes.error) {
      console.error('report_templates error:', templatesRes.error)
      if (templatesRes.error.code === '42P01') {
        return (
          <div className="p-8">
            <h1 className="text-xl font-bold text-[var(--foreground)]">Report Schedules</h1>
            <p className="mt-2 text-[var(--muted)]">
              The report_templates table is missing. Run the auto-scheduled reports migration in Supabase:
            </p>
            <code className="mt-2 block rounded bg-[var(--muted)]/20 p-3 text-sm">
              supabase/migrations/20260221_auto_scheduled_reports.sql
            </code>
          </div>
        )
      }
    }

    const templates = templatesRes.data ?? []
    const schedules = schedulesRes.data ?? []
    const clients = clientsRes.data ?? []

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Report Schedules</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Manage white-label report templates and scheduled delivery
          </p>
        </div>

        <ReportsAdminClient
          templates={templates}
          schedules={schedules}
          clients={clients}
        />
      </div>
    )
  } catch (err) {
    console.error('Reports page error:', err)
    const message = err instanceof Error ? err.message : String(err)
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold text-[var(--foreground)]">Something went wrong</h1>
        <p className="mt-2 text-[var(--muted)]">{message}</p>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Check the terminal for details. If report_templates or report_schedules tables are missing, run the
          20260221_auto_scheduled_reports.sql migration in Supabase.
        </p>
      </div>
    )
  }
}
