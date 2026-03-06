# Revenue Calculator Fix Guide

## Issue
The Revenue Impact Calculator isn't showing results because it requires:
1. ✅ The `client_revenue_monthly` table (from migration)
2. ❌ Clients with `service_start_date` configured
3. ❌ Monthly revenue data entered

## Step 1: Run the Migration

The migration file already exists. You need to apply it to your database:

### Option A: Via Supabase Dashboard
1. Go to **SQL Editor** in Supabase Dashboard
2. Open the file: `/supabase/migrations/20260213_revenue_impact_calculator.sql`
3. Copy and paste the contents
4. Click **Run**

### Option B: Via Supabase CLI
```bash
supabase db push
```

This will create:
- New columns on `clients` table (service_start_date, currency, baseline_method, etc.)
- New `client_revenue_monthly` table
- RPC function `calculate_client_revenue_impact`

## Step 2: Add Revenue Data to Mock Clients

After running the payment timeline seed script, you need to add:
1. Service start dates for clients
2. Monthly revenue data

Run the updated seed script: `seed-payment-timeline-with-revenue.sql`

## What the Updated Seed Script Does

1. Creates 6 clients with subscriptions (same as before)
2. **NEW**: Sets `service_start_date` for each client
3. **NEW**: Adds monthly revenue data for each client
4. Revenue data shows realistic growth over time

## Expected Revenue Calculator Display

After running both:
1. The migration (Step 1)
2. The seed script with revenue data (Step 2)

You should see:
- ✅ Client revenue configuration section
- ✅ Monthly revenue entries table
- ✅ Revenue impact summary cards
- ✅ Charts showing revenue growth
- ✅ Monthly breakdown table

## Verification

### Check Migration Applied
```sql
-- Check if new columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'clients' 
  AND column_name IN ('service_start_date', 'baseline_method', 'gross_margin_pct');

-- Should return 3 rows
```

### Check Table Exists
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'client_revenue_monthly';

-- Should return 1 row
```

### Check Revenue Data
```sql
SELECT 
  c.business_name,
  c.service_start_date,
  COUNT(crm.id) as revenue_entries
FROM clients c
LEFT JOIN client_revenue_monthly crm ON c.id = crm.client_id
GROUP BY c.id, c.business_name, c.service_start_date;
```

## Troubleshooting

### "No results showing"
- Make sure migration is applied
- Check that client has `service_start_date` set
- Verify revenue entries exist in `client_revenue_monthly`

### "Configuration Issues" warning
Common issues:
- No service start date set → Set one in the calculator UI
- Manual baseline selected but no value → Set baseline value
- No revenue data → Add at least one revenue entry

### "Baseline Data Warning"
- Means not enough pre-service revenue data for baseline calculation
- This is OK if you just started tracking
- Or switch to "Manual" baseline method
