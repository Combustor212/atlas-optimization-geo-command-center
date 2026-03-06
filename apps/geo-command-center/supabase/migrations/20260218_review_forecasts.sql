-- Review Velocity Forecasting
-- Stores computed review velocity and projections per location (optional competitor goal)

-- ============================================
-- REVIEW_FORECASTS TABLE
-- ============================================
CREATE TABLE review_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  competitor_id UUID NULL REFERENCES competitors(id) ON DELETE SET NULL,
  forecast_window_days INT NOT NULL DEFAULT 90,
  model_version TEXT NOT NULL DEFAULT 'linear_v1',
  current_review_count INT NOT NULL,
  current_velocity_per_day NUMERIC NOT NULL,
  projected_review_count INT NOT NULL,
  goal_review_count INT NULL,
  estimated_date_to_goal TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups and "latest by location"
CREATE INDEX idx_review_forecasts_agency ON review_forecasts(agency_id);
CREATE INDEX idx_review_forecasts_location ON review_forecasts(location_id);
CREATE INDEX idx_review_forecasts_location_created ON review_forecasts(location_id, created_at DESC);
CREATE INDEX idx_review_forecasts_competitor ON review_forecasts(competitor_id) WHERE competitor_id IS NOT NULL;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE review_forecasts ENABLE ROW LEVEL SECURITY;

-- Admin/Staff: full write access for their agency
CREATE POLICY "Agency members can manage review forecasts"
  ON review_forecasts
  FOR ALL
  USING (agency_id = get_user_agency_id())
  WITH CHECK (agency_id = get_user_agency_id());

-- Clients: read-only via location ownership
CREATE POLICY "Clients can view review forecasts for their locations"
  ON review_forecasts
  FOR SELECT
  USING (
    location_id IN (
      SELECT id FROM locations WHERE client_id = get_user_client_id()
    )
  );

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE review_forecasts IS 'Review velocity and projected count per location; optional competitor goal and date to surpass';
