import { redirect } from 'next/navigation'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { getClients } from '@/lib/data/clients'
import { RevenueCalculatorClient } from './RevenueCalculatorClient'

export default async function RevenueImpactCalculatorPage({
  searchParams,
}: {
  searchParams: { clientId?: string }
}) {
  const { agencyId } = (await getCurrentUserAgency()) || {}
  if (!agencyId) redirect('/login')

  const clients = await getClients(agencyId)

  return (
    <RevenueCalculatorClient
      clients={clients}
      initialClientId={searchParams.clientId}
    />
  )
}
