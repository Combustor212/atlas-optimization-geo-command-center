# Create Mock Client Account - Quick Guide

This guide helps you create a test client account to see what your clients see in the portal.

## Quick Steps

### Step 1: Get Your Agency ID

1. Go to Supabase Dashboard → SQL Editor
2. Run this query:
```sql
SELECT id, name FROM agencies LIMIT 1;
```
3. Copy the `id` value

### Step 2: Create the Client in Supabase Dashboard

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add User"**
3. Fill in:
   - **Email**: `client@example.com`
   - **Password**: `TestClient123!`
   - **Email Confirm**: ✅ (check this box)
4. Click **Create User**
5. **Copy the User ID** from the newly created user (you'll see it in the users list)

### Step 3: Run the Setup Script

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste this complete script:

```sql
-- ===== CONFIGURATION: Update these values =====
-- Replace with your actual agency_id from Step 1
DO $$
DECLARE
  v_agency_id UUID := 'YOUR_AGENCY_ID_HERE'; -- CHANGE THIS
  v_auth_user_id UUID := 'YOUR_AUTH_USER_ID_HERE'; -- CHANGE THIS (from Step 2)
  v_client_id UUID;
  v_location_ids UUID[];
BEGIN

-- Create Client
INSERT INTO clients (
  agency_id, 
  name, 
  email, 
  phone, 
  business_name,
  currency,
  baseline_method,
  gross_margin_pct,
  attribution_pct,
  service_start_date
) VALUES (
  v_agency_id,
  'Test Client User',
  'client@example.com',
  '(555) 999-0000',
  'Test Business LLC',
  'USD',
  'AVG_PRE_3',
  40.0,
  75.0,
  CURRENT_DATE - INTERVAL '90 days'
)
RETURNING id INTO v_client_id;

RAISE NOTICE 'Created client with ID: %', v_client_id;

-- Create Locations
INSERT INTO locations (
  client_id, 
  name, 
  address, 
  city, 
  state, 
  zip, 
  business_type,
  avg_repair_ticket, 
  avg_daily_jobs, 
  conversion_rate
) VALUES 
(
  v_client_id,
  'Main Office',
  '123 Business Ave',
  'Portland',
  'OR',
  '97201',
  'professional_services',
  500,
  8,
  30
),
(
  v_client_id,
  'Downtown Location',
  '456 Market Street',
  'Portland',
  'OR',
  '97204',
  'professional_services',
  450,
  6,
  28
)
RETURNING ARRAY_AGG(id) INTO v_location_ids;

RAISE NOTICE 'Created % locations', array_length(v_location_ids, 1);

-- Add Rankings Data (last 30 days)
INSERT INTO rankings (location_id, keyword, keyword_type, map_pack_position, organic_position, source, recorded_at)
SELECT 
  l.id,
  CASE 
    WHEN l.name = 'Main Office' THEN 'professional services near me'
    ELSE 'business consultant'
  END as keyword,
  'primary',
  FLOOR(2 + RANDOM() * 4)::INTEGER,
  FLOOR(3 + RANDOM() * 7)::INTEGER,
  'manual',
  CURRENT_DATE - (day || ' days')::INTERVAL
FROM locations l
CROSS JOIN generate_series(0, 29) as day
WHERE l.client_id = v_client_id;

-- Add Traffic Metrics
INSERT INTO traffic_metrics (location_id, organic_clicks, impressions, recorded_at)
SELECT 
  l.id,
  FLOOR(80 + RANDOM() * 120)::INTEGER,
  FLOOR(800 + RANDOM() * 1200)::INTEGER,
  CURRENT_DATE - (day || ' days')::INTERVAL
FROM locations l
CROSS JOIN generate_series(0, 29) as day
WHERE l.client_id = v_client_id;

-- Add Call Tracking
INSERT INTO calls_tracked (location_id, call_count, recorded_at)
SELECT 
  l.id,
  FLOOR(8 + RANDOM() * 15)::INTEGER,
  CURRENT_DATE - (day || ' days')::INTERVAL
FROM locations l
CROSS JOIN generate_series(0, 29) as day
WHERE l.client_id = v_client_id;

-- Add Reviews
INSERT INTO reviews (location_id, count, average_rating, recorded_at)
SELECT 
  l.id,
  FLOOR(RANDOM() * 4)::INTEGER,
  ROUND((4.2 + RANDOM() * 0.8)::NUMERIC, 1),
  CURRENT_DATE - (day || ' days')::INTERVAL
FROM locations l
CROSS JOIN generate_series(0, 29) as day
WHERE l.client_id = v_client_id;

-- Add Revenue Estimates
INSERT INTO revenue_estimates (location_id, estimated_monthly_lift, calculated_at)
SELECT 
  l.id,
  ROUND((l.avg_repair_ticket * l.avg_daily_jobs * 30 * 0.18)::NUMERIC, 2),
  NOW()
FROM locations l
WHERE l.client_id = v_client_id;

-- Create Profile (links auth user to client)
INSERT INTO profiles (
  id,
  client_id,
  role,
  full_name
) VALUES (
  v_auth_user_id,
  v_client_id,
  'client',
  'Test Client User'
);

RAISE NOTICE '✅ Mock client account created successfully!';
RAISE NOTICE 'Client ID: %', v_client_id;
RAISE NOTICE 'Auth User ID: %', v_auth_user_id;

END $$;
```

3. **Before running**, replace these two values at the top:
   - `YOUR_AGENCY_ID_HERE` → Your agency ID from Step 1
   - `YOUR_AUTH_USER_ID_HERE` → The User ID from Step 2
4. Click **Run**

### Step 4: Test the Client Login

1. Go to your app: `http://localhost:3000/login`
2. Login with:
   - **Email**: `client@example.com`
   - **Password**: `TestClient123!`
3. You should be redirected to `/portal` and see the client view!

## What You'll See

As a client user, you'll see:
- ✅ Client Portal dashboard with performance overview
- ✅ Location performance metrics (rankings, traffic, calls, reviews)
- ✅ Charts showing location performance
- ✅ Revenue lift estimates
- ✅ Generate report button
- ❌ NO access to the main dashboard or admin features

## Troubleshooting

**"Invalid login credentials"**
- Make sure you confirmed the email in Supabase Authentication when creating the user
- Check the email/password are correct

**Redirected to /dashboard instead of /portal**
- The profile wasn't created correctly
- Check the `profiles` table has a record with `role='client'` and your auth user ID

**"No locations" or empty data**
- Make sure you replaced both `YOUR_AGENCY_ID_HERE` and `YOUR_AUTH_USER_ID_HERE` in the script
- Check the script ran without errors

## Cleanup

To delete the test account:
```sql
-- Delete the test client and all related data
DELETE FROM clients WHERE email = 'client@example.com';

-- Delete the auth user from Supabase Dashboard > Authentication > Users
```

## Login Credentials (for reference)

- **Email**: `client@example.com`
- **Password**: `TestClient123!`
- **Portal URL**: `http://localhost:3000/portal`
