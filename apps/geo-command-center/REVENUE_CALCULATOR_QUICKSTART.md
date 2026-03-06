# Quick Start Guide - Revenue Impact Calculator

## Step 1: Run Database Migration

You have two options:

### Option A: Using Supabase SQL Editor (Recommended)

1. Log into your Supabase project dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of:
   ```
   apps/geo-command-center/supabase/migrations/20260213_revenue_impact_calculator.sql
   ```
5. Click **Run** to execute the migration
6. Verify success message

### Option B: Using Supabase CLI

```bash
cd apps/geo-command-center
supabase db push
```

## Step 2: Verify Migration

Run this query in SQL Editor to confirm tables exist:

```sql
-- Check if new columns exist in clients table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clients' 
  AND column_name IN (
    'service_start_date',
    'baseline_method',
    'gross_margin_pct',
    'attribution_pct'
  );

-- Check if client_revenue_monthly table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'client_revenue_monthly'
);

-- Check if RPC function exists
SELECT EXISTS (
  SELECT FROM pg_proc 
  WHERE proname = 'calculate_client_revenue_impact'
);
```

All queries should return results confirming the migration was successful.

## Step 3: Test the Feature

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to: **Dashboard → Revenue Calculator**

3. Select a client (or create a test client first)

4. Set up the client:
   - Set service start date (e.g., 3-6 months ago)
   - Choose baseline method (start with "Manual" for testing)
   - Enter manual baseline (e.g., 10000)
   - Set gross margin (e.g., 30%)
   - Set attribution (e.g., 100%)

5. Add revenue entries:
   - Click "Autofill Empty Months"
   - Add 3-4 months of baseline data (before service start)
   - Add 3-4 months of current data (after service start)
   - Use slightly higher values for after-start months to see positive lift

6. Verify calculations:
   - Check that metrics cards show data
   - Verify charts display correctly
   - Export CSV to test export functionality

## Step 4: Deploy to Production

Once tested locally:

1. Apply the same migration to production database
2. Deploy your code changes:
   ```bash
   npm run build
   # Deploy to your hosting platform
   ```

## Troubleshooting

### Issue: "Client not found" error
**Solution:** Ensure you're logged in and have clients in your agency

### Issue: "Insufficient baseline data" warning
**Solution:** Either:
- Add more pre-service revenue entries (3-6 months before start date)
- Switch to "Manual" baseline method and enter a baseline value

### Issue: Charts not displaying
**Solution:** Ensure you have at least 2 months of post-service revenue data

### Issue: RLS policy errors
**Solution:** Verify you're logged in and your user profile has an agency_id set

## Sample Data for Testing

If you want to quickly test with sample data, run this SQL (replace `YOUR_CLIENT_ID` and `YOUR_AGENCY_ID`):

```sql
-- Insert baseline months (before service start: 2024-01-01)
INSERT INTO client_revenue_monthly (client_id, agency_id, month, revenue, source)
VALUES
  ('YOUR_CLIENT_ID', 'YOUR_AGENCY_ID', '2023-10-01', 10000, 'MANUAL'),
  ('YOUR_CLIENT_ID', 'YOUR_AGENCY_ID', '2023-11-01', 11000, 'MANUAL'),
  ('YOUR_CLIENT_ID', 'YOUR_AGENCY_ID', '2023-12-01', 12000, 'MANUAL');

-- Insert after-service months (showing growth)
INSERT INTO client_revenue_monthly (client_id, agency_id, month, revenue, source)
VALUES
  ('YOUR_CLIENT_ID', 'YOUR_AGENCY_ID', '2024-01-01', 15000, 'MANUAL'),
  ('YOUR_CLIENT_ID', 'YOUR_AGENCY_ID', '2024-02-01', 16000, 'MANUAL'),
  ('YOUR_CLIENT_ID', 'YOUR_AGENCY_ID', '2024-03-01', 17000, 'MANUAL');

-- Update client with service start date
UPDATE clients 
SET 
  service_start_date = '2024-01-01',
  baseline_method = 'AVG_PRE_3',
  gross_margin_pct = 0.30,
  attribution_pct = 1.0
WHERE id = 'YOUR_CLIENT_ID';
```

Expected results with this sample data:
- Baseline: $11,000 (avg of 10k, 11k, 12k)
- Total Incremental Revenue: $15,000 (4k + 5k + 6k)
- Revenue Growth: ~54.5% (from 11k to 17k)
- Incremental Profit: $4,500 (15k × 30% margin)

## Need Help?

Check the main documentation: `REVENUE_IMPACT_CALCULATOR.md`
