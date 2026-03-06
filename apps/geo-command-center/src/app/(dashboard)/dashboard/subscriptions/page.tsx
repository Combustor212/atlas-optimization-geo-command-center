import { redirect } from 'next/navigation'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { getSubscriptionsByStatus, getLastPaymentsByClient } from '@/lib/data/agency'
import { getClients } from '@/lib/data/clients'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'

export default async function SubscriptionsPage() {
  const { agencyId } = (await getCurrentUserAgency()) || {}
  if (!agencyId) redirect('/login')

  const [subscriptions, clients, lastPaymentsMap] = await Promise.all([
    getSubscriptionsByStatus(agencyId),
    getClients(agencyId),
    getLastPaymentsByClient(agencyId),
  ])

  const clientMap = new Map(clients.map((c) => [c.id, c]))

  const activeSubscriptions = subscriptions.filter((s) => s.status === 'active')
  const pastDueSubscriptions = subscriptions.filter((s) => s.status === 'past_due')
  const trialingSubscriptions = subscriptions.filter((s) => s.status === 'trialing')

  const totalMRR = activeSubscriptions.reduce((sum, s) => sum + (s.mrr || 0), 0)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-[var(--success)]" />
      case 'canceled':
        return <XCircle className="h-5 w-5 text-[var(--danger)]" />
      case 'past_due':
        return <AlertCircle className="h-5 w-5 text-[var(--warning)]" />
      case 'trialing':
        return <Clock className="h-5 w-5 text-[var(--accent)]" />
      default:
        return null
    }
  }

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    return `${month}/${day}/${year}`
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Subscriptions</h1>
        <p className="mt-1 text-[var(--muted)]">Manage client subscriptions and recurring revenue</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-[var(--accent)]" />
            <div>
              <p className="text-sm text-[var(--muted)]">Total MRR</p>
              <p className="text-xl font-bold">{formatCurrency(totalMRR)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-[var(--success)]" />
            <div>
              <p className="text-sm text-[var(--muted)]">Active</p>
              <p className="text-xl font-bold">{activeSubscriptions.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-[var(--warning)]" />
            <div>
              <p className="text-sm text-[var(--muted)]">Past Due</p>
              <p className="text-xl font-bold">{pastDueSubscriptions.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-[var(--accent)]" />
            <div>
              <p className="text-sm text-[var(--muted)]">Trialing</p>
              <p className="text-xl font-bold">{trialingSubscriptions.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
        </CardHeader>
        {subscriptions.length === 0 ? (
          <div className="py-12 text-center text-[var(--muted)]">
            No subscriptions yet. Set up Stripe to start tracking subscriptions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Client</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Status</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">MRR</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Subscribed</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Last Payment</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Next Payment</th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted)]">Stripe ID</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => {
                  const client = sub.client_id ? clientMap.get(sub.client_id) : null
                  const lastPaymentDate = sub.client_id ? lastPaymentsMap.get(sub.client_id) : null
                  return (
                    <tr key={sub.stripe_subscription_id} className="border-b border-[var(--card-border)] last:border-0">
                      <td className="py-4 font-medium">
                        {client ? client.name : '—'}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(sub.status)}
                          <span>{getStatusLabel(sub.status)}</span>
                        </div>
                      </td>
                      <td className="py-4 font-medium">{formatCurrency(sub.mrr || 0)}</td>
                      <td className="py-4 text-sm text-[var(--muted)]">
                        {formatDate(sub.created_at)}
                      </td>
                      <td className="py-4 text-sm text-[var(--muted)]">
                        {formatDate(lastPaymentDate)}
                      </td>
                      <td className="py-4 text-sm text-[var(--muted)]">
                        {formatDate(sub.current_period_end)}
                      </td>
                      <td className="py-4 text-sm text-[var(--muted)] font-mono">
                        {sub.stripe_subscription_id || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Stripe Integration</CardTitle>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Subscriptions are automatically synced from Stripe webhooks
          </p>
        </CardHeader>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-lg border border-[var(--card-border)] p-3">
            <span className="text-[var(--muted)]">Webhook Endpoint</span>
            <code className="rounded bg-[var(--card-border)] px-2 py-1 text-xs">
              /api/stripe/webhook
            </code>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[var(--card-border)] p-3">
            <span className="text-[var(--muted)]">Listening for Events</span>
            <div className="flex gap-2 text-xs">
              <span className="rounded bg-[var(--success)]/20 px-2 py-1 text-[var(--success)]">
                subscription.created
              </span>
              <span className="rounded bg-[var(--success)]/20 px-2 py-1 text-[var(--success)]">
                subscription.updated
              </span>
              <span className="rounded bg-[var(--success)]/20 px-2 py-1 text-[var(--success)]">
                invoice.paid
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
