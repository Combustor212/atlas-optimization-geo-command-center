/**
 * Add Mock Subscriptions
 * Run this to populate subscriptions table with test data
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addMockSubscriptions() {
  console.log('💳 Adding mock subscriptions...\n')

  // Get the agency
  const { data: agencies } = await supabase.from('agencies').select('id').limit(1)
  if (!agencies || agencies.length === 0) {
    console.log('❌ No agency found')
    return
  }
  const agencyId = agencies[0].id

  // Get all clients
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, business_name')
    .eq('agency_id', agencyId)
  
  if (!clients || clients.length === 0) {
    console.log('❌ No clients found. Run seed-mock-data.mjs first!')
    return
  }

  // Subscription plans with different MRR amounts
  const plans = [
    { name: 'Basic Plan', mrr: 299, interval: 'month' },
    { name: 'Pro Plan', mrr: 599, interval: 'month' },
    { name: 'Enterprise Plan', mrr: 999, interval: 'month' },
    { name: 'Annual Basic', mrr: 249, interval: 'year' }, // 2988/12 = 249/month
    { name: 'Annual Pro', mrr: 499, interval: 'year' }, // 5988/12 = 499/month
  ]

  let count = 0
  
  for (const client of clients) {
    // Randomly assign a plan (80% chance of having a subscription)
    if (Math.random() > 0.2) {
      const plan = plans[Math.floor(Math.random() * plans.length)]
      const status = Math.random() > 0.1 ? 'active' : 'past_due' // 90% active
      
      const periodStart = new Date()
      periodStart.setDate(1) // Start of month
      const periodEnd = new Date(periodStart)
      periodEnd.setMonth(periodEnd.getMonth() + 1)
      
      const { error } = await supabase.from('subscriptions').insert({
        agency_id: agencyId,
        client_id: client.id,
        stripe_subscription_id: `sub_mock_${Math.random().toString(36).substring(7)}`,
        stripe_price_id: `price_${Math.random().toString(36).substring(7)}`,
        status: status,
        mrr: plan.mrr,
        interval: plan.interval,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (error) {
        console.log(`   ❌ Error for ${client.business_name}: ${error.message}`)
      } else {
        console.log(`   ✅ ${client.business_name} - ${plan.name} ($${plan.mrr}/mo) - ${status}`)
        count++
      }
    } else {
      console.log(`   ⊘ ${client.business_name} - No subscription`)
    }
  }

  console.log(`\n✨ Added ${count} subscriptions!`)
  console.log(`\nView them at: http://localhost:3001/dashboard/subscriptions`)
}

addMockSubscriptions().catch(console.error)
