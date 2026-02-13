import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { getClients } from '@/lib/data/clients'
import { Card } from '@/components/ui/Card'
import { AddClientForm } from '@/components/clients/AddClientForm'
import { Users } from 'lucide-react'

export default async function ClientsPage() {
  const { agencyId } = (await getCurrentUserAgency()) || {}
  if (!agencyId) redirect('/login')

  const clients = await getClients(agencyId)

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Clients</h1>
          <p className="mt-1 text-[var(--muted)]">Manage your client portfolio</p>
        </div>
        <AddClientForm />
      </div>

      {clients.length === 0 ? (
        <Card className="py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-[var(--muted)]" />
          <p className="mt-4 text-[var(--muted)]">No clients yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Add clients to start tracking their GEO performance
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/dashboard/clients/${client.id}`}>
              <Card className="transition-colors hover:border-[var(--accent)]/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
                    <Users className="h-5 w-5 text-[var(--accent)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{client.name}</p>
                    <p className="text-sm text-[var(--muted)]">{client.email}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
