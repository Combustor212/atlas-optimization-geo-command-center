-- =============================================================================
-- LEADS SETUP FOR GEO COMMAND CENTER
-- Paste this into Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================
-- Prerequisites: agencies table and get_user_agency_id(), is_agency_member() must exist.
-- If you get "relation agencies does not exist", run schema.sql first.
-- =============================================================================

-- 1. CREATE LEADS TABLE (skip if already exists)
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business_name TEXT,
  message TEXT,
  preferred_time TEXT,
  timezone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add source constraint (drop any existing source check first)
DO $$
DECLARE conname text;
BEGIN
  FOR conname IN
    SELECT c.conname FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'leads' AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%source%'
  LOOP
    EXECUTE format('ALTER TABLE leads DROP CONSTRAINT %I', conname);
  END LOOP;
END $$;
ALTER TABLE leads ADD CONSTRAINT leads_source_check
  CHECK (source IN ('contact_form', 'scheduled_call', 'scan'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_leads_agency ON leads(agency_id);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: agency members can view leads
DROP POLICY IF EXISTS "Agency members view leads" ON leads;
CREATE POLICY "Agency members view leads"
  ON leads FOR SELECT
  USING (agency_id = get_user_agency_id() AND is_agency_member());

-- 2. ADD METADATA COLUMN (for scan leads: address, city, scores, etc.)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 3. ADD BOOKING COLUMNS (for Book a Call)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS meet_link TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferred_date DATE;

-- 4. ADD FOLLOW-UP STATUS (for call requests)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_status TEXT;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_follow_up_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_follow_up_status_check
  CHECK (follow_up_status IS NULL OR follow_up_status IN (
    'pending', 'need_to_follow_up', 'contacted', 'scheduled', 'followed_up', 'no_answer'
  ));

-- Policy: agency members can update leads
DROP POLICY IF EXISTS "Agency members update leads" ON leads;
CREATE POLICY "Agency members update leads"
  ON leads FOR UPDATE
  USING (agency_id = get_user_agency_id() AND is_agency_member())
  WITH CHECK (agency_id = get_user_agency_id());

-- 5. POLICY: agency members can delete leads
DROP POLICY IF EXISTS "Agency members delete leads" ON leads;
CREATE POLICY "Agency members delete leads"
  ON leads FOR DELETE
  USING (agency_id = get_user_agency_id() AND is_agency_member());

-- 6. Index for scan leads
CREATE INDEX IF NOT EXISTS idx_leads_source_scan ON leads(agency_id, source) WHERE source = 'scan';

-- =============================================================================
-- DONE. Ensure you have:
-- - An agency (e.g. slug 'my-agency') in the agencies table
-- - AGS_LEADS_API_KEY and AGS_LEADS_AGENCY_SLUG set in Geo Command Center env
-- - AGS_LEADS_API_KEY and GEO_COMMAND_CENTER_URL set in MGO backend env
-- =============================================================================
