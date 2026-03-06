# Quick Fix: Revenue Calculator Not Showing Results

## The Problem
Revenue Calculator page is empty/not showing results because:
1. Migration for revenue tables hasn't been run yet
2. No revenue data exists in the database

## The Solution (2 Steps - 5 minutes)

### Step 1: Run the Migration

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- Copy/paste from: /supabase/migrations/20260213_revenue_impact_calculator.sql
```

Or just run this quick version:

```sql
-- Add revenue columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS service_start_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS baseline_method TEXT NOT NULL DEFAULT 'AVG_PRE_3';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS baseline_revenue_manual NUMERIC;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gross_margin_pct NUMERIC NOT NULL DEFAULT 0.30;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS attribution_pct NUMERIC NOT NULL DEFAULT 1.0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS exclude_partial_first_month BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS count_only_positive_lift BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS treat_missing_month_as_zero BOOLEAN NOT NULL DEFAULT false;

-- Create revenue table
CREATE TABLE IF NOT EXISTS client_revenue_monthly (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  revenue NUMERIC NOT NULL CHECK (revenue >= 0),
  source TEXT NOT NULL DEFAULT 'MANUAL',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT client_revenue_monthly_unique_month UNIQUE (client_id, month)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_client_revenue_client_month ON client_revenue_monthly(client_id, month);
CREATE INDEX IF NOT EXISTS idx_client_revenue_agency ON client_revenue_monthly(agency_id);

-- Enable RLS
ALTER TABLE client_revenue_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members see client revenue"
  ON client_revenue_monthly FOR SELECT
  USING (agency_id = get_user_agency_id());

CREATE POLICY "Agency members insert client revenue"
  ON client_revenue_monthly FOR INSERT
  WITH CHECK (agency_id = get_user_agency_id());

CREATE POLICY "Agency members update client revenue"
  ON client_revenue_monthly FOR UPDATE
  USING (agency_id = get_user_agency_id());

CREATE POLICY "Agency members delete client revenue"
  ON client_revenue_monthly FOR DELETE
  USING (agency_id = get_user_agency_id());

-- Add trigger
CREATE TRIGGER client_revenue_monthly_updated 
  BEFORE UPDATE ON client_revenue_monthly
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
```

Click **Run**. Should see "Success" message.

### Step 2: Add Mock Data with Revenue

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- Copy/paste from: /scripts/seed-payment-timeline-with-revenue.sql
```

This adds:
- ✅ 6 clients with service start dates
- ✅ 41 revenue entries showing growth over time
- ✅ Subscription payment timeline (Feb 7, 10, 16)

Click **Run**. Should see success message with summary.

### Step 3: View Results

1. Navigate to: `/dashboard/calculator`
2. Select a client from dropdown (e.g., "Johns Plumbing")
3. You should now see:
   - Revenue configuration settings
   - Monthly revenue entries table
   - Impact summary cards showing growth
   - Charts with revenue trends
   - Monthly breakdown

## What You'll See

For **Johns Plumbing** example:
- **Service Start Date**: Dec 1, 2025
- **Baseline Revenue**: ~$12,833/month (avg of Sept, Oct, Nov)
- **Current Revenue**: $16,200/month (Feb 2026)
- **Revenue Lift**: $3,367/month (+26.2%)
- **Total Incremental Revenue**: $6,700 (since service started)

Similar growth patterns for all 6 clients!

## Still Not Working?

### Check 1: Migration Applied?
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'clients' AND column_name = 'service_start_date';
```
Should return 1 row. If empty, migration didn't run.

### Check 2: Table Exists?
```sql
SELECT * FROM client_revenue_monthly LIMIT 1;
```
Should return data. If error "table doesn't exist", migration didn't run.

### Check 3: Revenue Data?
```sql
SELECT COUNT(*) FROM client_revenue_monthly;
```
Should return 41. If 0, seed script didn't run.

## Manual Alternative

If you want to test with ONE client manually:

1. Go to `/dashboard/clients`
2. Click on any client
3. Scroll to "Revenue Impact Calculator" section
4. Click "Configure Calculator"
5. Set "Service Start Date" (e.g., 2 months ago)
6. Click "Add Revenue Entry"
7. Add a few months of revenue data
8. Go to `/dashboard/calculator`
9. Select that client

The calculator will now show results!

## Common Issues

**"Configuration Issues" warning**
- Set service start date in calculator settings
- Make sure baseline method has required data

**No charts showing**
- Need at least 1 revenue entry after service start date
- Check service start date is in the past

**"Baseline Data Warning"**
- Normal if you just started tracking
- Or use "Manual" baseline method and enter a baseline value

That's it! Your calculator should now be working with realistic demo data.
