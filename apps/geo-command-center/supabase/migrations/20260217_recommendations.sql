-- Recommendations Action Engine Migration
-- Add recommendations and recommendation_events tables with RLS

-- ============================================
-- 1. RECOMMENDATIONS TABLE
-- ============================================
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('reviews','gmb','content','citations','technical','ai_visibility','search_visibility')),
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  expected_impact JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','dismissed')),
  created_by TEXT NOT NULL DEFAULT 'system' CHECK (created_by IN ('system','staff')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recommendations_agency ON recommendations(agency_id);
CREATE INDEX idx_recommendations_client ON recommendations(client_id);
CREATE INDEX idx_recommendations_location ON recommendations(location_id);
CREATE INDEX idx_recommendations_status ON recommendations(status);
CREATE INDEX idx_recommendations_type ON recommendations(type);
CREATE INDEX idx_recommendations_severity ON recommendations(severity);

-- ============================================
-- 2. RECOMMENDATION_EVENTS TABLE
-- ============================================
CREATE TABLE recommendation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  recommendation_id UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created','status_changed','dismissed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recommendation_events_recommendation ON recommendation_events(recommendation_id);
CREATE INDEX idx_recommendation_events_agency ON recommendation_events(agency_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_events ENABLE ROW LEVEL SECURITY;

-- Admin/Staff: Full CRUD access to their agency's recommendations
CREATE POLICY "Agency members can manage recommendations"
  ON recommendations FOR ALL
  USING (agency_id = get_user_agency_id() AND is_agency_member())
  WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());

-- Clients: Read-only access to recommendations for their locations
CREATE POLICY "Clients can view recommendations for their locations"
  ON recommendations FOR SELECT
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      WHERE l.client_id = get_user_client_id()
    )
  );

-- Admin/Staff: Full CRUD for recommendation_events
CREATE POLICY "Agency members can manage recommendation events"
  ON recommendation_events FOR ALL
  USING (agency_id = get_user_agency_id() AND is_agency_member())
  WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());

-- Clients: Read-only for their recommendation events (through recommendation's location)
CREATE POLICY "Clients can view recommendation events for their locations"
  ON recommendation_events FOR SELECT
  USING (
    recommendation_id IN (
      SELECT r.id FROM recommendations r
      JOIN locations l ON r.location_id = l.id
      WHERE l.client_id = get_user_client_id()
    )
  );

-- ============================================
-- AUTO-UPDATE TRIGGERS
-- ============================================

CREATE TRIGGER update_recommendations_updated_at
  BEFORE UPDATE ON recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE recommendations IS 'Action Engine recommendations generated per location';
COMMENT ON TABLE recommendation_events IS 'Audit log for recommendation lifecycle events';
