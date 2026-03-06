-- Client Health Score (0–100) + churn risk bands
-- Tables: health_scores, health_score_rules; RLS; indexes for list rendering

-- ============================================
-- HELPER: update_updated_at (if not already present)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HEALTH SCORE RULES (per-agency weighting)
-- ============================================
CREATE TABLE health_score_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_health_score_rules_agency ON health_score_rules(agency_id);
CREATE INDEX idx_health_score_rules_agency_active ON health_score_rules(agency_id, is_active) WHERE is_active = true;

-- ============================================
-- HEALTH SCORES (computed snapshots)
-- ============================================
CREATE TABLE health_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  score INTEGER NOT NULL,
  band TEXT NOT NULL CHECK (band IN ('healthy', 'watch', 'risk')),
  factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_health_scores_agency ON health_scores(agency_id);
CREATE INDEX idx_health_scores_client ON health_scores(client_id);
CREATE INDEX idx_health_scores_agency_calculated ON health_scores(agency_id, calculated_at DESC);
CREATE INDEX idx_health_scores_client_calculated ON health_scores(client_id, calculated_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE health_score_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_scores ENABLE ROW LEVEL SECURITY;

-- health_score_rules: admin/staff full in agency
CREATE POLICY "Agency members manage health rules"
  ON health_score_rules FOR ALL
  USING (agency_id = get_user_agency_id() AND is_agency_member())
  WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());

-- health_scores: admin/staff full in agency; client read-only for own client_id
CREATE POLICY "Agency members manage health scores"
  ON health_scores FOR ALL
  USING (agency_id = get_user_agency_id() AND is_agency_member())
  WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());

CREATE POLICY "Clients read own health scores"
  ON health_scores FOR SELECT
  USING (client_id = get_user_client_id());

-- ============================================
-- TRIGGER: updated_at for rules
-- ============================================
CREATE TRIGGER health_score_rules_updated
  BEFORE UPDATE ON health_score_rules
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
