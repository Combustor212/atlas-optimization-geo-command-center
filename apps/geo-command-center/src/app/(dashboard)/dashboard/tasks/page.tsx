import { redirect } from 'next/navigation'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { getClients } from '@/lib/data/clients'
import { getTasks } from '@/lib/data/tasks'
import { getAllUsers } from '@/lib/data/users'
import { createClient } from '@/lib/supabase/server'
import { TaskListClient } from '@/components/tasks/TaskListClient'
import { MeetingsCalendar } from '@/components/tasks/MeetingsCalendar'

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string; location_id?: string }>
}) {
  const { agencyId, role } = (await getCurrentUserAgency()) || {}
  if (!agencyId) redirect('/login')
  if (role === 'client') redirect('/dashboard')

  const params = await searchParams
  const filterClientId = params.client_id ?? ''
  const filterLocationId = params.location_id ?? ''
  const [tasks, clients, users] = await Promise.all([
    getTasks(agencyId, {
      ...(filterClientId && { client_id: filterClientId }),
      ...(filterLocationId && { location_id: filterLocationId }),
    }),
    getClients(agencyId),
    getAllUsers(agencyId),
  ])

  const supabase = await createClient()
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, client_id')
    .in('client_id', clients.map((c) => c.id))
    .order('name')

  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name }))
  const locationOptions = (locations ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    client_id: l.client_id,
  }))
  const userOptions = users.map((u) => ({
    id: u.id,
    full_name: u.full_name ?? null,
  }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Tasks & Workflow</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage execution tasks by client and location. Filter by status, priority, and assignee.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <TaskListClient
          initialTasks={tasks}
          clients={clientOptions}
          locations={locationOptions}
          users={userOptions}
          initialFilterClientId={filterClientId || undefined}
          initialFilterLocationId={filterLocationId || undefined}
          title="All tasks"
        />
        <MeetingsCalendar />
      </div>
    </div>
  )
}
