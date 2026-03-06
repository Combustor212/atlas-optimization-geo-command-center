#!/usr/bin/env node

/**
 * Mock Data Generator for GEO Command Center
 * 
 * This script generates realistic mock data for testing the application:
 * - Mock clients (businesses)
 * - Locations for each client
 * - Performance metrics (rankings, traffic, calls, reviews)
 * - Revenue data
 */

const mockClients = [
  {
    name: "John's Plumbing Services",
    business_name: "John's Plumbing Services LLC",
    email: "john@johnsplumbing.com",
    phone: "(555) 123-4567",
    locations: [
      {
        name: "Downtown Location",
        address: "123 Main St",
        city: "Seattle",
        state: "WA",
        zip: "98101",
        avg_repair_ticket: 450,
        avg_daily_jobs: 5,
        conversion_rate: 25,
      },
      {
        name: "North Branch",
        address: "456 North Ave",
        city: "Seattle",
        state: "WA",
        zip: "98103",
        avg_repair_ticket: 380,
        avg_daily_jobs: 4,
        conversion_rate: 22,
      }
    ]
  },
  {
    name: "Elite HVAC Solutions",
    business_name: "Elite HVAC Solutions Inc",
    email: "info@elitehvac.com",
    phone: "(555) 234-5678",
    locations: [
      {
        name: "Main Office",
        address: "789 Industrial Blvd",
        city: "Portland",
        state: "OR",
        zip: "97201",
        avg_repair_ticket: 650,
        avg_daily_jobs: 6,
        conversion_rate: 28,
      }
    ]
  },
  {
    name: "Green Lawn Care Pro",
    business_name: "Green Lawn Care Professional Services",
    email: "contact@greenlawnpro.com",
    phone: "(555) 345-6789",
    locations: [
      {
        name: "East Side Office",
        address: "321 Garden Way",
        city: "San Francisco",
        state: "CA",
        zip: "94102",
        avg_repair_ticket: 250,
        avg_daily_jobs: 8,
        conversion_rate: 30,
      },
      {
        name: "West Side Office",
        address: "654 Sunset Blvd",
        city: "San Francisco",
        state: "CA",
        zip: "94116",
        avg_repair_ticket: 280,
        avg_daily_jobs: 7,
        conversion_rate: 28,
      }
    ]
  },
  {
    name: "Bright Smile Dental",
    business_name: "Bright Smile Dental Care",
    email: "admin@brightsmile.com",
    phone: "(555) 456-7890",
    locations: [
      {
        name: "Downtown Clinic",
        address: "987 Health Plaza",
        city: "Austin",
        state: "TX",
        zip: "78701",
        avg_repair_ticket: 850,
        avg_daily_jobs: 12,
        conversion_rate: 35,
      }
    ]
  },
  {
    name: "QuickFix Auto Repair",
    business_name: "QuickFix Auto Repair & Service",
    email: "service@quickfixauto.com",
    phone: "(555) 567-8901",
    locations: [
      {
        name: "Main Garage",
        address: "147 Auto Center Dr",
        city: "Denver",
        state: "CO",
        zip: "80202",
        avg_repair_ticket: 550,
        avg_daily_jobs: 9,
        conversion_rate: 26,
      },
      {
        name: "Express Location",
        address: "258 Speed Lane",
        city: "Denver",
        state: "CO",
        zip: "80203",
        avg_repair_ticket: 420,
        avg_daily_jobs: 11,
        conversion_rate: 24,
      }
    ]
  },
  {
    name: "SafeGuard Security Systems",
    business_name: "SafeGuard Security Systems LLC",
    email: "info@safeguardsec.com",
    phone: "(555) 678-9012",
    locations: [
      {
        name: "Central Office",
        address: "369 Security Blvd",
        city: "Phoenix",
        state: "AZ",
        zip: "85001",
        avg_repair_ticket: 1200,
        avg_daily_jobs: 4,
        conversion_rate: 32,
      }
    ]
  }
];

console.log('Mock Data Summary:');
console.log('==================');
console.log(`Total Clients: ${mockClients.length}`);
console.log(`Total Locations: ${mockClients.reduce((sum, c) => sum + c.locations.length, 0)}`);
console.log('\nClients:');
mockClients.forEach((client, i) => {
  console.log(`\n${i + 1}. ${client.business_name}`);
  console.log(`   Contact: ${client.name}`);
  console.log(`   Email: ${client.email}`);
  console.log(`   Phone: ${client.phone}`);
  console.log(`   Locations: ${client.locations.length}`);
  client.locations.forEach((loc, j) => {
    console.log(`      ${j + 1}. ${loc.name} - ${loc.city}, ${loc.state}`);
    console.log(`         Avg Ticket: $${loc.avg_repair_ticket}`);
    console.log(`         Daily Jobs: ${loc.avg_daily_jobs}`);
    console.log(`         Conversion: ${loc.conversion_rate}%`);
  });
});

console.log('\n\nTo add this data to your database:');
console.log('1. Copy the mockClients array above');
console.log('2. Use the Supabase dashboard or SQL to insert the data');
console.log('3. Or create a database seed script using the Supabase client');

module.exports = { mockClients };
