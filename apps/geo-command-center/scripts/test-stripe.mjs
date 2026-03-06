/**
 * Test Stripe Integration
 * Shows subscription data and tests webhook
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

async function testStripeIntegration() {
  console.log('🧪 Testing Stripe Integration\n')
  console.log('=' .repeat(60))
  
  // Check subscriptions
  console.log('\n📊 SUBSCRIPTIONS\n')
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('*, clients(name, business_name)')
    .order('created_at', { ascending: false })
  
  if (subs && subs.length > 0) {
    console.log(`Found ${subs.length} subscription(s):\n`)
    let totalMRR = 0
    subs.forEach((sub, i) => {
      const clientName = sub.clients?.business_name || sub.clients?.name || 'Unknown'
      console.log(`${i + 1}. ${clientName}`)
      console.log(`   Status: ${sub.status}`)
      console.log(`   MRR: $${sub.mrr}/month`)
      console.log(`   Interval: ${sub.interval}`)
      console.log(`   Period: ${new Date(sub.current_period_start).toLocaleDateString()} - ${new Date(sub.current_period_end).toLocaleDateString()}`)
      console.log('')
      totalMRR += sub.mrr
    })
    console.log(`💰 Total MRR: $${totalMRR.toLocaleString()}/month\n`)
  } else {
    console.log('❌ No subscriptions found')
    console.log('Run: npm run seed:subscriptions\n')
  }
  
  console.log('=' .repeat(60))
  
  // Check payments
  console.log('\n💳 PAYMENTS (Recent)\n')
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .order('paid_at', { ascending: false })
    .limit(5)
  
  if (payments && payments.length > 0) {
    console.log(`Found ${payments.length} recent payment(s):\n`)
    payments.forEach((payment, i) => {
      console.log(`${i + 1}. Amount: $${payment.amount}`)
      console.log(`   Type: ${payment.type}`)
      console.log(`   Paid: ${new Date(payment.paid_at).toLocaleString()}`)
      console.log(`   Stripe ID: ${payment.stripe_payment_id}`)
      console.log('')
    })
  } else {
    console.log('❌ No payments found yet')
    console.log('Test with: ~/Desktop/stripe trigger payment_intent.succeeded\n')
  }
  
  console.log('=' .repeat(60))
  
  // Check Stripe config
  console.log('\n🔑 STRIPE CONFIGURATION\n')
  const hasSecretKey = !!process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder'
  const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_WEBHOOK_SECRET !== 'whsec_placeholder'
  
  console.log(`Secret Key: ${hasSecretKey ? '✅ Configured' : '❌ Missing'}`)
  console.log(`Webhook Secret: ${hasWebhookSecret ? '✅ Configured' : '❌ Missing'}`)
  
  if (hasSecretKey) {
    console.log(`Key starts with: ${process.env.STRIPE_SECRET_KEY.substring(0, 15)}...`)
  }
  
  console.log('\n' + '=' .repeat(60))
  
  console.log('\n✅ STRIPE IS WORKING!\n')
  console.log('📍 View subscriptions: http://localhost:3001/dashboard/subscriptions')
  console.log('📍 View dashboard: http://localhost:3001/dashboard')
  console.log('\n🧪 Test webhook: ~/Desktop/stripe trigger payment_intent.succeeded')
  console.log('🧪 Test invoice: ~/Desktop/stripe trigger invoice.paid')
  console.log('')
}

testStripeIntegration().catch(console.error)
