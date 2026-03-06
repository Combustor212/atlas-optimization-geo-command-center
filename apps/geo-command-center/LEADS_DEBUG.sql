-- =============================================================================
-- LEADS TROUBLESHOOTING - Run these in Supabase SQL Editor
-- =============================================================================

-- STEP 1: Check if agencies exist and their slugs
SELECT id, name, slug FROM agencies;

-- STEP 2: Check if any leads exist (run as service role or disable RLS temporarily)
SELECT id, agency_id, source, name, email, created_at FROM leads ORDER BY created_at DESC LIMIT 20;

-- STEP 3: Check your admin user's agency_id (replace YOUR_EMAIL with your login email)
SELECT p.id, p.agency_id, p.role, a.slug as agency_slug
FROM profiles p
LEFT JOIN agencies a ON a.id = p.agency_id
WHERE p.id IN (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL');

-- STEP 4: Insert a TEST lead (run this to verify the Leads page works)
-- IMPORTANT: You must be logged in as an ADMIN and your profile.agency_id must match.
-- Run STEP 3 first - use the agency_id from your profile. Then replace (SELECT id FROM agencies LIMIT 1)
-- with (SELECT id FROM agencies WHERE id = 'YOUR_AGENCY_ID') if you have multiple agencies.
INSERT INTO leads (agency_id, source, name, email, phone, business_name, message, metadata)
SELECT
  a.id,
  'scan',
  'Test Business',
  'test@example.com',
  '+1 555-123-4567',
  'Test Business LLC',
  'Free scan completed. Scores: MEO 75, SEO 60, GEO 70, Overall 68',
  '{"city": "Cincinnati", "state": "OH", "country": "United States", "address": "123 Main St", "meoScore": 75, "seoScore": 60, "geoScore": 70, "overallScore": 68}'::jsonb
FROM agencies a
LIMIT 1;

-- STEP 5: Ensure AGS_LEADS_AGENCY_SLUG matches your agency
-- Geo Command Center env: AGS_LEADS_AGENCY_SLUG=my-agency (or whatever slug you use)
-- Your agency MUST have that slug. If your agency has slug 'agency-abc123', set AGS_LEADS_AGENCY_SLUG=agency-abc123

-- STEP 6: Create agency with slug 'my-agency' if missing (optional)
INSERT INTO agencies (name, slug) VALUES ('My Agency', 'my-agency')
ON CONFLICT (slug) DO NOTHING;

-- STEP 7: Link your admin user to the my-agency agency (if needed)
-- Get your user id: SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL';
-- Get agency id: SELECT id FROM agencies WHERE slug = 'my-agency';
-- UPDATE profiles SET agency_id = 'AGENCY_UUID_HERE', role = 'admin' WHERE id = 'YOUR_USER_UUID';

-- =============================================================================
-- TEST LEADS API (run in terminal, not Supabase)
-- Replace YOUR_GEO_URL and YOUR_API_KEY with your actual values
-- =============================================================================
-- curl -X POST https://YOUR_GEO_URL/api/leads \
--   -H "Content-Type: application/json" \
--   -H "x-ags-leads-api-key: YOUR_API_KEY" \
--   -d '{"source":"scan","email":"test@example.com","business_name":"Test Co","message":"Test","metadata":{"city":"Cincinnati","state":"OH"}}'
-- Expected: {"success":true,"id":"...","created_at":"..."}
-- If 401: AGS_LEADS_API_KEY not set or mismatch in Geo Command Center
-- If 500 "Agency configuration error": No agency with slug from AGS_LEADS_AGENCY_SLUG
