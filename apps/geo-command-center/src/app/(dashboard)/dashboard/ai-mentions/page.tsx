import { redirect } from 'next/navigation'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { getClients } from '@/lib/data/clients'
import { getAIQueries, getQueuedAIRuns } from '@/lib/data/ai-mentions'
import { createClient } from '@/lib/supabase/server'
import { AIMentionsClient } from '@/components/ai-mentions/AIMentionsClient'

export default async function AIMentionsPage() {
  const { agencyId, role } = (await getCurrentUserAgency()) || {}
  if (!agencyId) redirect('/login')
  if (role === 'client') redirect('/dashboard')

  const [queries, runs, clients] = await Promise.all([
    getAIQueries(agencyId),
    getQueuedAIRuns(agencyId),
    getClients(agencyId),
  ])

  const supabase = await createClient()
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, client_id')
    .in('client_id', clients.map((c) => c.id))
    .order('name')

  const locationOptions = (locations ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    client_id: l.client_id,
  }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">AI Mention Tracking</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Manual assisted capture: save queries, paste AI responses when due, and track visibility.
        </p>
      </div>
      <AIMentionsClient
        initialQueries={queries}
        initialQueue={runs}
        locationOptions={locationOptions}
      />
    </div>
  )
}
