# Complete Setup: Auto Revenue Calculator from Subscriptions

## Overview
This setup will automatically populate the Revenue Calculator's start date when someone subscribes via Stripe.

## Step-by-Step Setup (Run in Order)

### Step 1: Run Revenue Calculator Migration
Creates the revenue tables and columns.

**Location:** `/supabase/migrations/20260213_revenue_impact_calculator.sql`

Go to **Supabase Dashboard → SQL Editor** and run that file.

---

### Step 2: Run Auto Service Date Migration
Creates trigger to auto-set service_start_date from subscriptions.

**Location:** `/supabase/migrations/20260215_auto_service_start_date.sql`

Run this in **SQL Editor**:

```sql
-- Auto-set service_start_date when subscription is created
CREATE OR REPLACE FUNCTION auto_set_service_start_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set if client doesn't have a service_start_date yet
  IF NEW.status = 'active' THEN
    UPDATE clients 
    SET service_start_date = DATE(NEW.current_period_start)
    WHERE id = NEW.client_id 
      AND service_start_date IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger fires after subscription is inserted
DROP TRIGGER IF EXISTS subscription_sets_service_date ON subscriptions;
CREATE TRIGGER subscription_sets_service_date
  AFTER INSERT ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_service_start_date();

-- Also handle updates (if subscription becomes active)
DROP TRIGGER IF EXISTS subscription_update_sets_service_date ON subscriptions;
CREATE TRIGGER subscription_update_sets_service_date
  AFTER UPDATE ON subscriptions
  FOR EACH ROW
  WHEN (NEW.status = 'active' AND OLD.status != 'active')
  EXECUTE FUNCTION auto_set_service_start_date();
```

---

### Step 3: Add Mock Data for Testing
Creates 6 clients with subscriptions and revenue data to test everything.

**Location:** `/scripts/seed-payment-timeline-with-revenue.sql`

Run this in **SQL Editor**. It includes:
- ✅ 6 clients with subscriptions (Feb 7, 10, 16 payment dates)
- ✅ Service start dates already set
- ✅ 41 monthly revenue entries showing growth
- ✅ Complete demo data for testing

---

## How It Works (Future Subscriptions)

When a new client subscribes via Stripe:

1. **Stripe webhook** creates a subscription record in your `subscriptions` table
2. **Trigger fires automatically** and sets `clients.service_start_date` = subscription start date
3. **Revenue Calculator** is now ready to use for that client
4. You (or the client) can add monthly revenue data
5. Calculator shows revenue impact automatically

## What Happens with Mock Data

The seed script creates clients with subscriptions in February 2026:
- **Client 1**: Subscribed Feb 7 → service_start_date = Dec 1, 2025 (set manually in seed)
- **Client 2**: Subscribed Feb 10 → service_start_date = Nov 15, 2025
- **Client 3**: Subscribed Feb 10 → service_start_date = Jan 1, 2026
- etc.

The mock data backdates the service start dates so you can see revenue growth over time.

## What You Need to Track Revenue

### Automatically Set by Subscription:
- ✅ `service_start_date` (set when they subscribe)
- ✅ `baseline_method` (default: AVG_PRE_3)
- ✅ `gross_margin_pct` (default: 30%)
- ✅ `attribution_pct` (default: 100%)

### Manual Entry Required:
- ❌ **Monthly revenue data** - Someone needs to enter actual revenue numbers

## Options for Revenue Data Entry

### Option 1: Manual Entry (Your Client Does It)
1. Client logs into their dashboard
2. Goes to `/dashboard/calculator`
3. Selects their business
4. Clicks "Autofill Empty Months"
5. Enters revenue for each month
6. Calculator shows their growth

### Option 2: Integration (Future)
Connect to:
- QuickBooks API → auto-import monthly revenue
- Stripe → pull revenue from Stripe (if they sell online)
- Square → pull POS revenue
- Manual CSV import

### Option 3: You Enter It for Them
1. Client sends you revenue numbers monthly
2. You log in as admin
3. Go to calculator
4. Enter their revenue
5. Generate report for them

## Testing Your Setup

### 1. Verify Migrations Applied:
```sql
-- Check revenue table exists
SELECT COUNT(*) FROM client_revenue_monthly;

-- Check trigger exists
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'subscription_sets_service_date';
```

### 2. Test Automatic Service Date:
```sql
-- Get a test client ID
SELECT id, name FROM clients LIMIT 1;

-- Clear their service date (for testing)
UPDATE clients SET service_start_date = NULL WHERE id = 'YOUR_CLIENT_ID';

-- Create a test subscription (this should auto-set service_start_date)
INSERT INTO subscriptions (
  agency_id, 
  client_id, 
  status, 
  mrr,
  current_period_start
) VALUES (
  (SELECT agency_id FROM clients LIMIT 1),
  'YOUR_CLIENT_ID',
  'active',
  500,
  NOW()
);

-- Check if service_start_date was set automatically
SELECT service_start_date FROM clients WHERE id = 'YOUR_CLIENT_ID';
-- Should now show today's date!
```

### 3. Test Calculator with Mock Data:
1. Run the seed script
2. Go to `/dashboard/calculator`
3. Select "Johns Plumbing" from dropdown
4. You should see:
   - ✅ Service start date: Dec 1, 2025
   - ✅ 6 months of revenue data
   - ✅ Revenue growth charts
   - ✅ Impact calculations

## Summary

**For Testing Now:**
```sql
-- Run these 3 scripts in order:
1. /supabase/migrations/20260213_revenue_impact_calculator.sql
2. /supabase/migrations/20260215_auto_service_start_date.sql
3. /scripts/seed-payment-timeline-with-revenue.sql
```

**For Production Later:**
- ✅ Service start date sets automatically when someone subscribes
- ❌ Revenue data still needs manual entry (or future integration)
- ✅ Calculator will be ready to use immediately after subscription

**The only thing NOT automated is the monthly revenue numbers** - that's what makes this calculator valuable. It tracks REAL business revenue, not just leads/traffic. Someone needs to input actual revenue from their accounting system.
