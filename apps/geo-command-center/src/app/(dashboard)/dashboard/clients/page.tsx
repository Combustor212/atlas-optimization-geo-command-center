import { redirect } from 'next/navigation'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { getClients } from '@/lib/data/clients'
import { getLatestHealthScoresByAgency } from '@/lib/data/health'
import { ClientsView } from '@/components/clients/ClientsView'

export default async function ClientsPage() {
  const { agencyId } = (await getCurrentUserAgency()) || {}
  if (!agencyId) redirect('/login')

  const [clients, healthByClient] = await Promise.all([
    getClients(agencyId),
    getLatestHealthScoresByAgency(agencyId),
  ])

  return <ClientsView clients={clients} healthByClient={healthByClient} />
}
