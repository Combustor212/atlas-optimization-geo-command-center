-- ============================================================
-- 1. VERIFY: Check if your test client has locations and data
-- ============================================================
-- Run this first. You should see 2 rows (2 locations) and non-zero counts.

SELECT
  c.name AS client_name,
  l.name AS location_name,
  l.id AS location_id,
  (SELECT COUNT(*) FROM rankings r WHERE r.location_id = l.id AND r.recorded_at >= CURRENT_DATE - INTERVAL '30 days') AS rankings_count,
  (SELECT COUNT(*) FROM traffic_metrics t WHERE t.location_id = l.id AND t.recorded_at >= CURRENT_DATE - INTERVAL '30 days') AS traffic_count,
  (SELECT COUNT(*) FROM calls_tracked ct WHERE ct.location_id = l.id AND ct.recorded_at >= CURRENT_DATE - INTERVAL '30 days') AS calls_count,
  (SELECT COUNT(*) FROM reviews rv WHERE rv.location_id = l.id AND rv.recorded_at >= CURRENT_DATE - INTERVAL '30 days') AS reviews_count
FROM clients c
JOIN locations l ON l.client_id = c.id
WHERE c.email = 'client@example.com'
ORDER BY l.name;

-- If you see 0 locations: create the mock client + locations first (see CREATE_CLIENT_ACCOUNT_GUIDE.md).
-- If you see 1 location: run "2. ADD SECOND LOCATION" and "3. SEED SECOND LOCATION" below.
-- If you see 2 locations but zeros: run "3. SEED SECOND LOCATION" for all locations (or re-run Option A with ON CONFLICT handling).


-- ============================================================
-- 2. ADD SECOND LOCATION (only if test client has 1 location)
-- ============================================================
-- Run this only if the query above showed a single location.

INSERT INTO locations (
  client_id, name, address, city, state, zip, business_type,
  avg_repair_ticket, avg_daily_jobs, conversion_rate
)
SELECT
  c.id,
  'Downtown Location',
  '456 Market Street',
  'Portland',
  'OR',
  '97204',
  'professional_services',
  450,
  6,
  28
FROM clients c
WHERE c.email = 'client@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM locations l WHERE l.client_id = c.id AND l.name = 'Downtown Location'
  );


-- ============================================================
-- 3. SEED CHART DATA (30 days) for ALL locations of test client
-- ============================================================
-- Use this if verification showed 0 data, or after adding a second location.
-- This DELETES existing metric data for that client's locations then re-inserts.

DO $$
DECLARE
  loc RECORD;
BEGIN
  FOR loc IN
    SELECT l.id AS id, l.name AS name
    FROM locations l
    JOIN clients c ON l.client_id = c.id
    WHERE c.email = 'client@example.com'
  LOOP
    DELETE FROM rankings WHERE location_id = loc.id AND recorded_at >= CURRENT_DATE - INTERVAL '30 days';
    DELETE FROM traffic_metrics WHERE location_id = loc.id AND recorded_at >= CURRENT_DATE - INTERVAL '30 days';
    DELETE FROM calls_tracked WHERE location_id = loc.id AND recorded_at >= CURRENT_DATE - INTERVAL '30 days';
    DELETE FROM reviews WHERE location_id = loc.id AND recorded_at >= CURRENT_DATE - INTERVAL '30 days';

    INSERT INTO rankings (location_id, keyword, keyword_type, map_pack_position, organic_position, source, recorded_at)
    SELECT loc.id, 'professional services near me', 'primary',
      2 + (FLOOR(RANDOM() * 5))::INT, 3 + (FLOOR(RANDOM() * 8))::INT, 'manual',
      (CURRENT_DATE - (s.day || ' days')::INTERVAL)::DATE
    FROM generate_series(0, 29) AS s(day);

    INSERT INTO traffic_metrics (location_id, organic_clicks, impressions, recorded_at, source)
    SELECT loc.id, 60 + (FLOOR(RANDOM() * 140))::INT, 600 + (FLOOR(RANDOM() * 1400))::INT,
      (CURRENT_DATE - (s.day || ' days')::INTERVAL)::DATE, 'gsc'
    FROM generate_series(0, 29) AS s(day);

    INSERT INTO calls_tracked (location_id, call_count, recorded_at)
    SELECT loc.id, 5 + (FLOOR(RANDOM() * 18))::INT, (CURRENT_DATE - (s.day || ' days')::INTERVAL)::DATE
    FROM generate_series(0, 29) AS s(day);

    INSERT INTO reviews (location_id, count, avg_rating, recorded_at)
    SELECT loc.id, (FLOOR(RANDOM() * 4))::INT, ROUND((4.0 + RANDOM() * 1.0)::NUMERIC, 2), (CURRENT_DATE - (s.day || ' days')::INTERVAL)::DATE
    FROM generate_series(0, 29) AS s(day);

    RAISE NOTICE 'Seeded 30 days for location: %', loc.name;
  END LOOP;
END $$;
