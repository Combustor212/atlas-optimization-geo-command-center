-- Mock Data for GEO Command Center
-- This script inserts realistic test data for demonstration purposes

-- Note: Replace 'YOUR_AGENCY_ID' with your actual agency_id from the agencies table
-- You can find your agency_id by running: SELECT id FROM agencies;

-- Set your agency ID here
\set agency_id 'YOUR_AGENCY_ID'

-- Insert Mock Clients
INSERT INTO clients (agency_id, name, business_name, email, phone) VALUES
-- 1. Plumbing business
(:agency_id, 'John Smith', 'John''s Plumbing Services LLC', 'john@johnsplumbing.com', '(555) 123-4567'),
-- 2. HVAC business
(:agency_id, 'Sarah Johnson', 'Elite HVAC Solutions Inc', 'info@elitehvac.com', '(555) 234-5678'),
-- 3. Lawn care business
(:agency_id, 'Mike Green', 'Green Lawn Care Professional Services', 'contact@greenlawnpro.com', '(555) 345-6789'),
-- 4. Dental practice
(:agency_id, 'Dr. Lisa Chen', 'Bright Smile Dental Care', 'admin@brightsmile.com', '(555) 456-7890'),
-- 5. Auto repair shop
(:agency_id, 'Tom Rodriguez', 'QuickFix Auto Repair & Service', 'service@quickfixauto.com', '(555) 567-8901'),
-- 6. Security systems
(:agency_id, 'David Williams', 'SafeGuard Security Systems LLC', 'info@safeguardsec.com', '(555) 678-9012');

-- Get the client IDs (you'll need to retrieve these from your database)
-- For this demo, we'll use subqueries

-- Insert Locations for John's Plumbing
INSERT INTO locations (client_id, name, address, city, state, zip, avg_repair_ticket, avg_daily_jobs, conversion_rate)
SELECT id, 'Downtown Location', '123 Main St', 'Seattle', 'WA', '98101', 450, 5, 25
FROM clients WHERE email = 'john@johnsplumbing.com';

INSERT INTO locations (client_id, name, address, city, state, zip, avg_repair_ticket, avg_daily_jobs, conversion_rate)
SELECT id, 'North Branch', '456 North Ave', 'Seattle', 'WA', '98103', 380, 4, 22
FROM clients WHERE email = 'john@johnsplumbing.com';

-- Insert Location for Elite HVAC
INSERT INTO locations (client_id, name, address, city, state, zip, avg_repair_ticket, avg_daily_jobs, conversion_rate)
SELECT id, 'Main Office', '789 Industrial Blvd', 'Portland', 'OR', '97201', 650, 6, 28
FROM clients WHERE email = 'info@elitehvac.com';

-- Insert Locations for Green Lawn Care
INSERT INTO locations (client_id, name, address, city, state, zip, avg_repair_ticket, avg_daily_jobs, conversion_rate)
SELECT id, 'East Side Office', '321 Garden Way', 'San Francisco', 'CA', '94102', 250, 8, 30
FROM clients WHERE email = 'contact@greenlawnpro.com';

INSERT INTO locations (client_id, name, address, city, state, zip, avg_repair_ticket, avg_daily_jobs, conversion_rate)
SELECT id, 'West Side Office', '654 Sunset Blvd', 'San Francisco', 'CA', '94116', 280, 7, 28
FROM clients WHERE email = 'contact@greenlawnpro.com';

-- Insert Location for Bright Smile Dental
INSERT INTO locations (client_id, name, address, city, state, zip, avg_repair_ticket, avg_daily_jobs, conversion_rate)
SELECT id, 'Downtown Clinic', '987 Health Plaza', 'Austin', 'TX', '78701', 850, 12, 35
FROM clients WHERE email = 'admin@brightsmile.com';

-- Insert Locations for QuickFix Auto
INSERT INTO locations (client_id, name, address, city, state, zip, avg_repair_ticket, avg_daily_jobs, conversion_rate)
SELECT id, 'Main Garage', '147 Auto Center Dr', 'Denver', 'CO', '80202', 550, 9, 26
FROM clients WHERE email = 'service@quickfixauto.com';

INSERT INTO locations (client_id, name, address, city, state, zip, avg_repair_ticket, avg_daily_jobs, conversion_rate)
SELECT id, 'Express Location', '258 Speed Lane', 'Denver', 'CO', '80203', 420, 11, 24
FROM clients WHERE email = 'service@quickfixauto.com';

-- Insert Location for SafeGuard Security
INSERT INTO locations (client_id, name, address, city, state, zip, avg_repair_ticket, avg_daily_jobs, conversion_rate)
SELECT id, 'Central Office', '369 Security Blvd', 'Phoenix', 'AZ', '85001', 1200, 4, 32
FROM clients WHERE email = 'info@safeguardsec.com';

-- Insert Sample Rankings (last 30 days of data)
-- This creates ranking entries for each location with realistic trending data
WITH location_ids AS (
  SELECT l.id, l.name, c.business_name
  FROM locations l
  JOIN clients c ON l.client_id = c.id
  WHERE c.agency_id = :agency_id
)
INSERT INTO rankings (location_id, keyword, keyword_type, map_pack_position, organic_position, source, recorded_at)
SELECT 
  id,
  CASE 
    WHEN name LIKE '%Downtown%' THEN 'plumber near me'
    WHEN name LIKE '%North%' THEN 'emergency plumbing'
    WHEN name LIKE '%Main Office%' THEN 'hvac repair'
    WHEN name LIKE '%East Side%' THEN 'lawn care service'
    WHEN name LIKE '%West Side%' THEN 'landscaping company'
    WHEN name LIKE '%Clinic%' THEN 'dentist near me'
    WHEN name LIKE '%Main Garage%' THEN 'auto repair shop'
    WHEN name LIKE '%Express%' THEN 'car mechanic near me'
    ELSE 'security systems installation'
  END as keyword,
  'primary',
  FLOOR(3 + RANDOM() * 5)::INTEGER, -- Random map pack position 3-7
  FLOOR(5 + RANDOM() * 10)::INTEGER, -- Random organic position 5-14
  'manual',
  CURRENT_DATE - (day || ' days')::INTERVAL
FROM location_ids
CROSS JOIN generate_series(0, 29) as day;

-- Insert Sample Traffic Metrics
WITH location_ids AS (
  SELECT l.id
  FROM locations l
  JOIN clients c ON l.client_id = c.id
  WHERE c.agency_id = :agency_id
)
INSERT INTO traffic_metrics (location_id, organic_clicks, impressions, recorded_at)
SELECT 
  id,
  FLOOR(50 + RANDOM() * 150)::INTEGER, -- Random clicks 50-200
  FLOOR(500 + RANDOM() * 1500)::INTEGER, -- Random impressions 500-2000
  CURRENT_DATE - (day || ' days')::INTERVAL
FROM location_ids
CROSS JOIN generate_series(0, 29) as day;

-- Insert Sample Call Tracking Data
WITH location_ids AS (
  SELECT l.id
  FROM locations l
  JOIN clients c ON l.client_id = c.id
  WHERE c.agency_id = :agency_id
)
INSERT INTO calls_tracked (location_id, call_count, recorded_at)
SELECT 
  id,
  FLOOR(5 + RANDOM() * 20)::INTEGER, -- Random calls 5-25
  CURRENT_DATE - (day || ' days')::INTERVAL
FROM location_ids
CROSS JOIN generate_series(0, 29) as day;

-- Insert Sample Reviews Data
WITH location_ids AS (
  SELECT l.id
  FROM locations l
  JOIN clients c ON l.client_id = c.id
  WHERE c.agency_id = :agency_id
)
INSERT INTO reviews (location_id, count, average_rating, recorded_at)
SELECT 
  id,
  FLOOR(RANDOM() * 5)::INTEGER, -- Random new reviews 0-5
  ROUND((4.0 + RANDOM())::NUMERIC, 1), -- Random rating 4.0-5.0
  CURRENT_DATE - (day || ' days')::INTERVAL
FROM location_ids
CROSS JOIN generate_series(0, 29) as day;

-- Insert Sample Revenue Estimates
WITH location_ids AS (
  SELECT l.id, l.avg_repair_ticket, l.avg_daily_jobs
  FROM locations l
  JOIN clients c ON l.client_id = c.id
  WHERE c.agency_id = :agency_id
)
INSERT INTO revenue_estimates (location_id, estimated_monthly_lift, calculated_at)
SELECT 
  id,
  ROUND((avg_repair_ticket * avg_daily_jobs * 30 * 0.15)::NUMERIC, 2), -- 15% revenue lift estimate
  NOW()
FROM location_ids;

-- Summary query to verify data
SELECT 
  'Clients' as entity,
  COUNT(*) as count
FROM clients
WHERE agency_id = :agency_id
UNION ALL
SELECT 
  'Locations',
  COUNT(*)
FROM locations l
JOIN clients c ON l.client_id = c.id
WHERE c.agency_id = :agency_id
UNION ALL
SELECT 
  'Rankings',
  COUNT(*)
FROM rankings r
JOIN locations l ON r.location_id = l.id
JOIN clients c ON l.client_id = c.id
WHERE c.agency_id = :agency_id
UNION ALL
SELECT 
  'Traffic Metrics',
  COUNT(*)
FROM traffic_metrics tm
JOIN locations l ON tm.location_id = l.id
JOIN clients c ON l.client_id = c.id
WHERE c.agency_id = :agency_id;
