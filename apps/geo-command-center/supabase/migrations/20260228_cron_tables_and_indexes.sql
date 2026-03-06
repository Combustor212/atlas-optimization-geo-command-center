-- Cron job support: location_keywords, unique indexes for idempotent upserts
-- Run in Supabase SQL Editor or via migration

-- ============================================
-- 1. LOCATION_KEYWORDS (for geo rank tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS location_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_keywords_location ON location_keywords(location_id);
CREATE INDEX IF NOT EXISTS idx_location_keywords_agency_active ON location_keywords(agency_id, is_active) WHERE is_active = true;

-- RLS
ALTER TABLE location_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members manage location keywords"
  ON location_keywords FOR ALL
  USING (agency_id = get_user_agency_id() AND is_agency_member())
  WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());

CREATE POLICY "Clients read keywords for their locations"
  ON location_keywords FOR SELECT
  USING (
    location_id IN (SELECT id FROM locations WHERE client_id = get_user_client_id())
  );

-- ============================================
-- 2. UNIQUE INDEX: reviews (location_id, recorded_at, source)
-- For place-details cron upsert: one snapshot per location per day per source
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_location_recorded_source
  ON reviews (location_id, recorded_at, source);

-- ============================================
-- 3. UNIQUE INDEX: rankings (location_id, keyword, recorded_at, source)
-- For geo-ranks cron upsert: one snapshot per location per keyword per hour per source
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_rankings_location_keyword_recorded_source
  ON rankings (location_id, keyword, recorded_at, source);
