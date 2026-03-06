/**
 * Seed Mock Data Script
 * 
 * Run this script to populate your GEO Command Center with realistic mock data
 * 
 * Usage:
 * 1. Make sure your .env.local file has the correct Supabase credentials
 * 2. Run: node scripts/seed-mock-data.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in .env.local')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const mockBusinesses = [
  {
    name: 'John Smith',
    business_name: "John's Plumbing Services LLC",
    email: 'john@johnsplumbing.com',
    phone: '(555) 123-4567',
    locations: [
      {
        name: 'Downtown Location',
        address: '123 Main St',
        city: 'Seattle',
        state: 'WA',
        zip: '98101',
        avg_repair_ticket: 450,
        avg_daily_jobs: 5,
        conversion_rate: 25,
        keyword: 'plumber near me'
      },
      {
        name: 'North Branch',
        address: '456 North Ave',
        city: 'Seattle',
        state: 'WA',
        zip: '98103',
        avg_repair_ticket: 380,
        avg_daily_jobs: 4,
        conversion_rate: 22,
        keyword: 'emergency plumbing'
      }
    ]
  },
  {
    name: 'Sarah Johnson',
    business_name: 'Elite HVAC Solutions Inc',
    email: 'info@elitehvac.com',
    phone: '(555) 234-5678',
    locations: [
      {
        name: 'Main Office',
        address: '789 Industrial Blvd',
        city: 'Portland',
        state: 'OR',
        zip: '97201',
        avg_repair_ticket: 650,
        avg_daily_jobs: 6,
        conversion_rate: 28,
        keyword: 'hvac repair near me'
      }
    ]
  },
  {
    name: 'Mike Green',
    business_name: 'Green Lawn Care Professional Services',
    email: 'contact@greenlawnpro.com',
    phone: '(555) 345-6789',
    locations: [
      {
        name: 'East Side Office',
        address: '321 Garden Way',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        avg_repair_ticket: 250,
        avg_daily_jobs: 8,
        conversion_rate: 30,
        keyword: 'lawn care service'
      },
      {
        name: 'West Side Office',
        address: '654 Sunset Blvd',
        city: 'San Francisco',
        state: 'CA',
        zip: '94116',
        avg_repair_ticket: 280,
        avg_daily_jobs: 7,
        conversion_rate: 28,
        keyword: 'landscaping company'
      }
    ]
  },
  {
    name: 'Dr. Lisa Chen',
    business_name: 'Bright Smile Dental Care',
    email: 'admin@brightsmile.com',
    phone: '(555) 456-7890',
    locations: [
      {
        name: 'Downtown Clinic',
        address: '987 Health Plaza',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        avg_repair_ticket: 850,
        avg_daily_jobs: 12,
        conversion_rate: 35,
        keyword: 'dentist near me'
      }
    ]
  },
  {
    name: 'Tom Rodriguez',
    business_name: 'QuickFix Auto Repair & Service',
    email: 'service@quickfixauto.com',
    phone: '(555) 567-8901',
    locations: [
      {
        name: 'Main Garage',
        address: '147 Auto Center Dr',
        city: 'Denver',
        state: 'CO',
        zip: '80202',
        avg_repair_ticket: 550,
        avg_daily_jobs: 9,
        conversion_rate: 26,
        keyword: 'auto repair shop'
      },
      {
        name: 'Express Location',
        address: '258 Speed Lane',
        city: 'Denver',
        state: 'CO',
        zip: '80203',
        avg_repair_ticket: 420,
        avg_daily_jobs: 11,
        conversion_rate: 24,
        keyword: 'car mechanic near me'
      }
    ]
  },
  {
    name: 'David Williams',
    business_name: 'SafeGuard Security Systems LLC',
    email: 'info@safeguardsec.com',
    phone: '(555) 678-9012',
    locations: [
      {
        name: 'Central Office',
        address: '369 Security Blvd',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85001',
        avg_repair_ticket: 1200,
        avg_daily_jobs: 4,
        conversion_rate: 32,
        keyword: 'security systems installation'
      }
    ]
  }
]

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min, max, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

async function seedData() {
  console.log('🌱 Starting mock data seed...\n')

  // Get the first agency (or you can specify an agency_id)
  const { data: agencies, error: agencyError } = await supabase
    .from('agencies')
    .select('id')
    .limit(1)

  if (agencyError || !agencies || agencies.length === 0) {
    console.error('❌ Error: No agency found. Please create an agency first.')
    process.exit(1)
  }

  const agencyId = agencies[0].id
  console.log(`✅ Using agency ID: ${agencyId}\n`)

  let totalClients = 0
  let totalLocations = 0

  for (const business of mockBusinesses) {
    console.log(`📊 Creating client: ${business.business_name}`)

    // Insert client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        agency_id: agencyId,
        name: business.name,
        business_name: business.business_name,
        email: business.email,
        phone: business.phone
      })
      .select()
      .single()

    if (clientError) {
      console.error(`   ❌ Error creating client: ${clientError.message}`)
      continue
    }

    totalClients++
    console.log(`   ✅ Client created`)

    // Insert locations for this client
    for (const location of business.locations) {
      console.log(`   📍 Creating location: ${location.name}`)

      const { data: loc, error: locError } = await supabase
        .from('locations')
        .insert({
          client_id: client.id,
          name: location.name,
          address: location.address,
          city: location.city,
          state: location.state,
          zip: location.zip,
          avg_repair_ticket: location.avg_repair_ticket,
          avg_daily_jobs: location.avg_daily_jobs,
          conversion_rate: location.conversion_rate
        })
        .select()
        .single()

      if (locError) {
        console.error(`      ❌ Error creating location: ${locError.message}`)
        continue
      }

      totalLocations++

      // Insert ranking data for last 30 days
      const rankings = []
      for (let day = 0; day < 30; day++) {
        const date = new Date()
        date.setDate(date.getDate() - day)
        rankings.push({
          location_id: loc.id,
          keyword: location.keyword,
          keyword_type: 'primary',
          map_pack_position: randomInt(2, 8),
          organic_position: randomInt(3, 15),
          source: 'manual',
          recorded_at: date.toISOString()
        })
      }

      await supabase.from('rankings').insert(rankings)

      // Insert traffic metrics
      const traffic = []
      for (let day = 0; day < 30; day++) {
        const date = new Date()
        date.setDate(date.getDate() - day)
        traffic.push({
          location_id: loc.id,
          organic_clicks: randomInt(50, 200),
          impressions: randomInt(500, 2000),
          recorded_at: date.toISOString().split('T')[0]
        })
      }

      await supabase.from('traffic_metrics').insert(traffic)

      // Insert call tracking
      const calls = []
      for (let day = 0; day < 30; day++) {
        const date = new Date()
        date.setDate(date.getDate() - day)
        calls.push({
          location_id: loc.id,
          call_count: randomInt(3, 25),
          recorded_at: date.toISOString().split('T')[0]
        })
      }

      await supabase.from('calls_tracked').insert(calls)

      // Insert reviews
      const reviews = []
      for (let day = 0; day < 30; day++) {
        const date = new Date()
        date.setDate(date.getDate() - day)
        reviews.push({
          location_id: loc.id,
          count: randomInt(0, 5),
          average_rating: randomFloat(4.0, 5.0, 1),
          recorded_at: date.toISOString().split('T')[0]
        })
      }

      await supabase.from('reviews').insert(reviews)

      // Insert revenue estimate
      const estimatedLift = (location.avg_repair_ticket * location.avg_daily_jobs * 30 * 0.15).toFixed(2)
      await supabase.from('revenue_estimates').insert({
        location_id: loc.id,
        estimated_monthly_lift: parseFloat(estimatedLift),
        calculated_at: new Date().toISOString()
      })

      console.log(`      ✅ Location and metrics created`)
    }

    console.log('')
  }

  console.log('✨ Seed complete!\n')
  console.log(`📊 Summary:`)
  console.log(`   Clients created: ${totalClients}`)
  console.log(`   Locations created: ${totalLocations}`)
  console.log(`   Rankings: ${totalLocations * 30} entries`)
  console.log(`   Traffic metrics: ${totalLocations * 30} entries`)
  console.log(`   Call tracking: ${totalLocations * 30} entries`)
  console.log(`   Reviews: ${totalLocations * 30} entries`)
  console.log(`\n✅ Your GEO Command Center is now populated with mock data!`)
  console.log(`\nView your data at: http://localhost:3001/dashboard/clients`)
}

seedData().catch(console.error)
