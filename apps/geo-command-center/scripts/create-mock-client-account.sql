-- Create Mock Client Account for Testing Client Portal View
-- This script creates a client user account that you can use to log in and see what clients see

-- ============================================
-- STEP 1: Create the Auth User in Supabase
-- ============================================
-- You'll need to run this in the Supabase SQL Editor

-- First, get your agency_id (replace this if you already know your agency_id)
-- SELECT id FROM agencies LIMIT 1;

-- Set your agency ID here
\set agency_id 'YOUR_AGENCY_ID_HERE'

-- ============================================
-- STEP 2: Create a Client Record
-- ============================================
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
  :agency_id,
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
RETURNING id;

-- Save the client_id from above, you'll need it below
-- Set the client_id here
\set client_id 'YOUR_CLIENT_ID_HERE'

-- ============================================
-- STEP 3: Create Locations for the Test Client
-- ============================================
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
  :client_id,
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
  :client_id,
  'Downtown Location',
  '456 Market Street',
  'Portland',
  'OR',
  '97204',
  'professional_services',
  450,
  6,
  28
);

-- ============================================
-- STEP 4: Add Sample Performance Data
-- ============================================

-- Get location IDs for the test client
WITH test_locations AS (
  SELECT id, name FROM locations WHERE client_id = :client_id
)

-- Add Rankings Data (last 30 days)
INSERT INTO rankings (location_id, keyword, keyword_type, map_pack_position, organic_position, source, recorded_at)
SELECT 
  id,
  CASE 
    WHEN name = 'Main Office' THEN 'professional services near me'
    ELSE 'business consultant'
  END as keyword,
  'primary',
  FLOOR(2 + RANDOM() * 4)::INTEGER, -- Random rank 2-5
  FLOOR(3 + RANDOM() * 7)::INTEGER, -- Random organic 3-9
  'manual',
  CURRENT_DATE - (day || ' days')::INTERVAL
FROM test_locations
CROSS JOIN generate_series(0, 29) as day;

-- Add Traffic Metrics (last 30 days)
WITH test_locations AS (
  SELECT id FROM locations WHERE client_id = :client_id
)
INSERT INTO traffic_metrics (location_id, organic_clicks, impressions, recorded_at)
SELECT 
  id,
  FLOOR(80 + RANDOM() * 120)::INTEGER, -- Random clicks 80-200
  FLOOR(800 + RANDOM() * 1200)::INTEGER, -- Random impressions 800-2000
  CURRENT_DATE - (day || ' days')::INTERVAL
FROM test_locations
CROSS JOIN generate_series(0, 29) as day;

-- Add Call Tracking Data (last 30 days)
WITH test_locations AS (
  SELECT id FROM locations WHERE client_id = :client_id
)
INSERT INTO calls_tracked (location_id, call_count, recorded_at)
SELECT 
  id,
  FLOOR(8 + RANDOM() * 15)::INTEGER, -- Random calls 8-23
  CURRENT_DATE - (day || ' days')::INTERVAL
FROM test_locations
CROSS JOIN generate_series(0, 29) as day;

-- Add Reviews Data (last 30 days)
WITH test_locations AS (
  SELECT id FROM locations WHERE client_id = :client_id
)
INSERT INTO reviews (location_id, count, average_rating, recorded_at)
SELECT 
  id,
  FLOOR(RANDOM() * 4)::INTEGER, -- Random new reviews 0-3
  ROUND((4.2 + RANDOM() * 0.8)::NUMERIC, 1), -- Random rating 4.2-5.0
  CURRENT_DATE - (day || ' days')::INTERVAL
FROM test_locations
CROSS JOIN generate_series(0, 29) as day;

-- Add Revenue Estimates
WITH test_locations AS (
  SELECT id, avg_repair_ticket, avg_daily_jobs 
  FROM locations 
  WHERE client_id = :client_id
)
INSERT INTO revenue_estimates (location_id, estimated_monthly_lift, calculated_at)
SELECT 
  id,
  ROUND((avg_repair_ticket * avg_daily_jobs * 30 * 0.18)::NUMERIC, 2), -- 18% revenue lift
  NOW()
FROM test_locations;

-- ============================================
-- STEP 5: Create Auth User & Profile
-- ============================================
-- NOTE: You must create the user in Supabase Authentication first!
-- Go to Supabase Dashboard > Authentication > Users > Add User
-- Email: client@example.com
-- Password: TestClient123!
-- After creating the user, get the user_id and run this:

-- Set the auth user_id here (get it from Supabase Dashboard after creating the user)
\set auth_user_id 'YOUR_AUTH_USER_ID_HERE'

-- Create the profile linking the auth user to the client
INSERT INTO profiles (
  id,
  client_id,
  role,
  full_name
) VALUES (
  :auth_user_id,
  :client_id,
  'client',
  'Test Client User'
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify the client was created
SELECT 
  'Client Created' as status,
  id,
  name,
  email,
  business_name
FROM clients
WHERE email = 'client@example.com';

-- Verify locations
SELECT 
  'Locations' as entity,
  COUNT(*) as count
FROM locations
WHERE client_id = :client_id;

-- Verify performance data
SELECT 
  'Rankings' as entity,
  COUNT(*) as count
FROM rankings r
JOIN locations l ON r.location_id = l.id
WHERE l.client_id = :client_id
UNION ALL
SELECT 
  'Traffic Metrics',
  COUNT(*)
FROM traffic_metrics tm
JOIN locations l ON tm.location_id = l.id
WHERE l.client_id = :client_id
UNION ALL
SELECT 
  'Calls Tracked',
  COUNT(*)
FROM calls_tracked ct
JOIN locations l ON ct.location_id = l.id
WHERE l.client_id = :client_id
UNION ALL
SELECT 
  'Reviews',
  COUNT(*)
FROM reviews rv
JOIN locations l ON rv.location_id = l.id
WHERE l.client_id = :client_id;

-- Verify profile
SELECT 
  'Profile Created' as status,
  p.id,
  p.role,
  p.full_name,
  c.name as client_name
FROM profiles p
JOIN clients c ON p.client_id = c.id
WHERE c.email = 'client@example.com';

-- ============================================
-- LOGIN CREDENTIALS
-- ============================================
-- Email: client@example.com
-- Password: TestClient123!
-- Portal URL: http://localhost:3000/portal
