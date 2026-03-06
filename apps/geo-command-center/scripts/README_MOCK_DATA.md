# Mock Data Setup Guide

This guide will help you populate your GEO Command Center with realistic mock data for demonstration and testing purposes.

## Mock Businesses Included

The seed script creates 6 realistic businesses across different industries:

1. **John's Plumbing Services LLC** 
   - 2 locations in Seattle, WA
   - Avg ticket: $380-$450
   - Contact: john@johnsplumbing.com

2. **Elite HVAC Solutions Inc**
   - 1 location in Portland, OR
   - Avg ticket: $650
   - Contact: info@elitehvac.com

3. **Green Lawn Care Professional Services**
   - 2 locations in San Francisco, CA
   - Avg ticket: $250-$280
   - Contact: contact@greenlawnpro.com

4. **Bright Smile Dental Care**
   - 1 location in Austin, TX
   - Avg ticket: $850
   - Contact: admin@brightsmile.com

5. **QuickFix Auto Repair & Service**
   - 2 locations in Denver, CO
   - Avg ticket: $420-$550
   - Contact: service@quickfixauto.com

6. **SafeGuard Security Systems LLC**
   - 1 location in Phoenix, AZ
   - Avg ticket: $1,200
   - Contact: info@safeguardsec.com

## Data Generated

For each location, the script creates:

- ✅ **30 days of ranking data** (Map Pack & Organic positions)
- ✅ **30 days of traffic metrics** (clicks & impressions)
- ✅ **30 days of call tracking** (phone calls generated)
- ✅ **30 days of reviews** (new reviews & ratings)
- ✅ **Revenue estimates** (calculated based on ticket size and job volume)

## Method 1: Run the JavaScript Seed Script (Recommended)

### Prerequisites

Install the required dependency:

```bash
cd apps/geo-command-center
npm install @supabase/supabase-js dotenv
```

### Run the Script

```bash
node scripts/seed-mock-data.mjs
```

The script will:
1. Connect to your Supabase database using credentials from `.env.local`
2. Find your agency ID automatically
3. Create all 6 mock clients with their locations
4. Generate 30 days of performance data for each location
5. Display a summary of created records

### Expected Output

```
🌱 Starting mock data seed...

✅ Using agency ID: abc123...

📊 Creating client: John's Plumbing Services LLC
   ✅ Client created
   📍 Creating location: Downtown Location
      ✅ Location and metrics created
   📍 Creating location: North Branch
      ✅ Location and metrics created

... (continues for all businesses)

✨ Seed complete!

📊 Summary:
   Clients created: 6
   Locations created: 9
   Rankings: 270 entries
   Traffic metrics: 270 entries
   Call tracking: 270 entries
   Reviews: 270 entries

✅ Your GEO Command Center is now populated with mock data!

View your data at: http://localhost:3001/dashboard/clients
```

## Method 2: Manual SQL (Alternative)

If you prefer to use SQL directly:

1. Open the Supabase Dashboard
2. Go to the SQL Editor
3. Get your agency ID:
   ```sql
   SELECT id FROM agencies;
   ```
4. Open `scripts/seed-mock-data.sql`
5. Replace `YOUR_AGENCY_ID` with your actual agency ID
6. Run the SQL script in the Supabase SQL Editor

## Method 3: Using Supabase Dashboard (Manual)

You can also manually add clients through the application:

1. Navigate to http://localhost:3001/dashboard/clients
2. Click "Add Client"
3. Fill in the client details from the mock data above
4. Add locations for each client
5. Add performance metrics using the action buttons

## Viewing the Mock Data

After seeding, visit these pages to see the data:

- **Clients List**: http://localhost:3001/dashboard/clients
- **Individual Client**: Click on any client card
- **GEO Tracking**: http://localhost:3001/dashboard/geo
- **Revenue Calculator**: http://localhost:3001/dashboard/calculator

## Features to Test

With the mock data, you can test:

1. ✅ **Client Management**
   - View list of 6 businesses
   - Click into individual client details
   - See performance metrics and charts

2. ✅ **Delete Functionality**
   - Use "Delete Clients" button to select and remove clients
   - Test confirmation dialogs
   - Delete from individual client pages

3. ✅ **Performance Tracking**
   - View ranking history charts (30 days)
   - See traffic growth trends
   - Monitor calls and reviews

4. ✅ **Revenue Calculator**
   - Calculate impact with real business data
   - See estimated revenue lift

5. ✅ **Navigation**
   - Test sidebar highlighting
   - Navigate between sections

## Cleaning Up Mock Data

To remove all mock data:

```sql
-- Delete all clients for your agency (cascade will remove related data)
DELETE FROM clients WHERE agency_id = 'YOUR_AGENCY_ID';
```

Or use the "Delete Clients" feature in the application to selectively remove businesses.

## Troubleshooting

### Error: "No agency found"

Make sure you have an agency created. If not, sign up through the application first, which will automatically create an agency for your user.

### Error: "Missing Supabase credentials"

Ensure your `.env.local` file contains:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (optional)
```

### Script runs but no data appears

Check that:
1. You're logged in to the application
2. Your user is associated with the correct agency
3. The seed script completed without errors

## Next Steps

After populating the database:

1. Explore the Clients page to see all businesses
2. Click on a client to view detailed performance metrics
3. Try the delete functionality with checkboxes
4. Navigate through different sections to see the data
5. Use the Revenue Calculator with the mock business data

Enjoy exploring your GEO Command Center with realistic data!
