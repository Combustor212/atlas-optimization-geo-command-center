-- Add 'scan' source for leads from AGS free scan submissions
-- Add metadata JSONB for scan-specific data (address, city, state, scores, etc.)

-- Drop existing source check constraint (find by definition)
DO $$
DECLARE
  conname text;
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

-- Add new constraint including 'scan'
ALTER TABLE leads ADD CONSTRAINT leads_source_check
  CHECK (source IN ('contact_form', 'scheduled_call', 'scan'));

-- Add metadata for scan-specific data (address, city, state, zipCode, website, scores, etc.)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Index for filtering by source (scan leads)
CREATE INDEX IF NOT EXISTS idx_leads_source_scan ON leads(agency_id, source) WHERE source = 'scan';
