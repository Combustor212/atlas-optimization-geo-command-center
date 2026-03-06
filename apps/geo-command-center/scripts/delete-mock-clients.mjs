/**
 * Delete Mock Clients & Data Script
 *
 * Removes all mock clients and related data from seed-mock-data.mjs or seed-payment-timeline.sql
 * - Clients (cascade: locations, rankings, traffic, calls, reviews, revenue_estimates, subscriptions, client_revenue_monthly)
 * - Orphaned payments (pi_mock_*)
 * - Orphaned subscriptions (sub_mock_*)
 *
 * Usage: node scripts/delete-mock-clients.mjs
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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const MOCK_EMAILS = [
  'john@johnsplumbing.com',
  'info@elitehvac.com',
  'contact@greenlawnpro.com',
  'admin@brightsmile.com',
  'service@quickfixauto.com',
  'info@safeguardsec.com'
]

async function deleteMockData() {
  console.log('🗑️  Deleting mock clients and data...\n')
  let totalDeleted = 0

  // 1. Delete mock clients (cascade removes locations, rankings, traffic, subscriptions, etc.)
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, business_name, email')
    .in('email', MOCK_EMAILS)

  if (error) {
    console.error('❌ Error fetching clients:', error.message)
    process.exit(1)
  }

  if (clients && clients.length > 0) {
    console.log(`Found ${clients.length} mock client(s):`)
    clients.forEach((c) => console.log(`   - ${c.business_name || c.name} (${c.email})`))
    const ids = clients.map((c) => c.id)
    const { error: deleteError } = await supabase.from('clients').delete().in('id', ids)
    if (deleteError) {
      console.error('❌ Error deleting clients:', deleteError.message)
      process.exit(1)
    }
    totalDeleted += clients.length
    console.log(`   ✅ Deleted ${clients.length} clients + related data\n`)
  }

  // 2. Delete orphaned mock payments (client_id set to null when client deleted)
  const { data: mockPayments } = await supabase
    .from('payments')
    .select('id')
    .ilike('stripe_payment_id', 'pi_mock_%')

  if (mockPayments && mockPayments.length > 0) {
    const { error: payErr } = await supabase.from('payments').delete().in('id', mockPayments.map((p) => p.id))
    if (!payErr) {
      console.log(`   ✅ Deleted ${mockPayments.length} mock payment(s)\n`)
      totalDeleted += mockPayments.length
    }
  }

  // 3. Delete any remaining mock subscriptions
  const { data: mockSubs } = await supabase
    .from('subscriptions')
    .select('id')
    .ilike('stripe_subscription_id', 'sub_mock_%')

  if (mockSubs && mockSubs.length > 0) {
    const { error: subErr } = await supabase.from('subscriptions').delete().in('id', mockSubs.map((s) => s.id))
    if (!subErr) {
      console.log(`   ✅ Deleted ${mockSubs.length} mock subscription(s)\n`)
      totalDeleted += mockSubs.length
    }
  }

  if (totalDeleted === 0 && (!clients?.length) && (!mockPayments?.length) && (!mockSubs?.length)) {
    console.log('No mock data found. Database is already clean.\n')
  } else {
    console.log('✅ Mock clients and data removed.\n')
  }
}

deleteMockData().catch(console.error)
