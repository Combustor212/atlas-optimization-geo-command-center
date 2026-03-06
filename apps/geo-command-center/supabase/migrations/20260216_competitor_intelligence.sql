-- Competitor Intelligence Migration
-- Add competitor tracking and comparison features

-- ============================================
-- 1. COMPETITORS TABLE
-- ============================================
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  google_place_id TEXT,
  website TEXT,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for competitors
CREATE INDEX idx_competitors_agency_location ON competitors(agency_id, location_id);
CREATE INDEX idx_competitors_location ON competitors(location_id);
CREATE INDEX idx_competitors_client ON competitors(client_id);
CREATE INDEX idx_competitors_place_id ON competitors(google_place_id) WHERE google_place_id IS NOT NULL;

-- ============================================
-- 2. COMPETITOR RANK SNAPSHOTS TABLE
-- ============================================
CREATE TABLE competitor_rank_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  grid_point JSONB, -- {lat: number, lng: number}
  rank_position INTEGER NOT NULL CHECK (rank_position > 0),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL CHECK (source IN ('manual', 'google_api', 'local_falcon')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for rank snapshots
CREATE INDEX idx_rank_snapshots_agency_competitor ON competitor_rank_snapshots(agency_id, competitor_id, captured_at DESC);
CREATE INDEX idx_rank_snapshots_location ON competitor_rank_snapshots(location_id, captured_at DESC);
CREATE INDEX idx_rank_snapshots_keyword ON competitor_rank_snapshots(keyword, captured_at DESC);

-- ============================================
-- 3. COMPETITOR REVIEW SNAPSHOTS TABLE
-- ============================================
CREATE TABLE competitor_review_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  rating NUMERIC(3,2) CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER NOT NULL CHECK (review_count >= 0),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for review snapshots
CREATE INDEX idx_review_snapshots_agency_competitor ON competitor_review_snapshots(agency_id, competitor_id, captured_at DESC);
CREATE INDEX idx_review_snapshots_captured ON competitor_review_snapshots(captured_at DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get latest rank snapshot for a competitor
CREATE OR REPLACE FUNCTION get_latest_rank_snapshot(comp_id UUID, kw TEXT DEFAULT NULL)
RETURNS competitor_rank_snapshots AS $$
  SELECT * FROM competitor_rank_snapshots
  WHERE competitor_id = comp_id
    AND (kw IS NULL OR keyword = kw)
  ORDER BY captured_at DESC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Get latest review snapshot for a competitor
CREATE OR REPLACE FUNCTION get_latest_review_snapshot(comp_id UUID)
RETURNS competitor_review_snapshots AS $$
  SELECT * FROM competitor_review_snapshots
  WHERE competitor_id = comp_id
  ORDER BY captured_at DESC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Calculate review velocity (reviews per day over last 30 days)
CREATE OR REPLACE FUNCTION get_review_velocity(comp_id UUID)
RETURNS NUMERIC AS $$
  WITH recent AS (
    SELECT review_count, captured_at
    FROM competitor_review_snapshots
    WHERE competitor_id = comp_id
      AND captured_at >= NOW() - INTERVAL '30 days'
    ORDER BY captured_at DESC
    LIMIT 1
  ),
  older AS (
    SELECT review_count, captured_at
    FROM competitor_review_snapshots
    WHERE competitor_id = comp_id
      AND captured_at >= NOW() - INTERVAL '60 days'
      AND captured_at < NOW() - INTERVAL '30 days'
    ORDER BY captured_at DESC
    LIMIT 1
  )
  SELECT 
    CASE 
      WHEN recent.review_count IS NULL OR older.review_count IS NULL THEN 0
      ELSE (recent.review_count - older.review_count)::NUMERIC / 30
    END
  FROM recent, older;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_rank_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_review_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: COMPETITORS
-- ============================================

-- Admin/Staff: Full CRUD access to their agency's competitors
CREATE POLICY "Agency members can manage competitors"
  ON competitors
  FOR ALL
  USING (agency_id = get_user_agency_id())
  WITH CHECK (agency_id = get_user_agency_id());

-- Clients: Read-only access to competitors for their locations
CREATE POLICY "Clients can view competitors for their locations"
  ON competitors
  FOR SELECT
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      WHERE l.client_id = get_user_client_id()
    )
  );

-- ============================================
-- RLS POLICIES: RANK SNAPSHOTS
-- ============================================

-- Admin/Staff: Full CRUD access to their agency's snapshots
CREATE POLICY "Agency members can manage rank snapshots"
  ON competitor_rank_snapshots
  FOR ALL
  USING (agency_id = get_user_agency_id())
  WITH CHECK (agency_id = get_user_agency_id());

-- Clients: Read-only access to snapshots for their locations
CREATE POLICY "Clients can view rank snapshots for their locations"
  ON competitor_rank_snapshots
  FOR SELECT
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      WHERE l.client_id = get_user_client_id()
    )
  );

-- ============================================
-- RLS POLICIES: REVIEW SNAPSHOTS
-- ============================================

-- Admin/Staff: Full CRUD access to their agency's snapshots
CREATE POLICY "Agency members can manage review snapshots"
  ON competitor_review_snapshots
  FOR ALL
  USING (agency_id = get_user_agency_id())
  WITH CHECK (agency_id = get_user_agency_id());

-- Clients: Read-only access to review snapshots for their competitors
CREATE POLICY "Clients can view review snapshots for their competitors"
  ON competitor_review_snapshots
  FOR SELECT
  USING (
    competitor_id IN (
      SELECT c.id FROM competitors c
      JOIN locations l ON c.location_id = l.id
      WHERE l.client_id = get_user_client_id()
    )
  );

-- ============================================
-- AUTO-UPDATE TRIGGERS
-- ============================================

CREATE TRIGGER update_competitors_updated_at
  BEFORE UPDATE ON competitors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE competitors IS 'Competitor businesses tracked per location';
COMMENT ON TABLE competitor_rank_snapshots IS 'Historical rank tracking for competitors';
COMMENT ON TABLE competitor_review_snapshots IS 'Historical review and rating tracking for competitors';
COMMENT ON COLUMN competitor_rank_snapshots.grid_point IS 'Geographic point for heatmap visualization: {lat: number, lng: number}';
COMMENT ON FUNCTION get_review_velocity IS 'Calculate average reviews per day over last 30 days';
