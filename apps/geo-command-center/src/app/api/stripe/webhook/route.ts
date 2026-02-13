import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'

function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: unknown) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription & { current_period_start?: number; current_period_end?: number }
        const priceId = sub.items.data[0]?.price.id
        const price = await getStripe().prices.retrieve(priceId)
        const mrr = price.unit_amount ? (price.unit_amount / 100) * (price.recurring?.interval === 'year' ? 1 / 12 : 1) : 0

        await getSupabaseAdmin().from('subscriptions').upsert({
          stripe_subscription_id: sub.id,
          stripe_price_id: priceId,
          status: sub.status === 'active' ? 'active' : sub.status === 'canceled' ? 'canceled' : 'past_due',
          mrr,
          interval: price.recurring?.interval ?? 'month',
          current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
          current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'stripe_subscription_id' })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await getSupabaseAdmin()
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice & { payment_intent?: string; billing_reason?: string }
        const agencyId = invoice.metadata?.agency_id
        const clientId = invoice.metadata?.client_id
        if (!agencyId) break

        const paymentType = invoice.billing_reason === 'subscription_create' ? 'setup' : 'subscription'
        await getSupabaseAdmin().from('payments').insert({
          agency_id: agencyId,
          client_id: clientId || null,
          stripe_payment_id: String(invoice.payment_intent || invoice.id),
          amount: (invoice.amount_paid || 0) / 100,
          type: paymentType,
          description: invoice.description || null,
          paid_at: new Date().toISOString(),
        })
        break
      }

      case 'payment_intent.succeeded': {
        const payment = event.data.object as Stripe.PaymentIntent
        const agencyId = payment.metadata?.agency_id
        const clientId = payment.metadata?.client_id
        if (!agencyId) break

        await getSupabaseAdmin().from('payments').insert({
          agency_id: agencyId,
          client_id: clientId || null,
          stripe_payment_id: payment.id,
          amount: (payment.amount || 0) / 100,
          type: (payment.metadata?.type as 'subscription' | 'setup' | 'one_time') || 'one_time',
          description: payment.description || null,
          paid_at: new Date().toISOString(),
        })
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
