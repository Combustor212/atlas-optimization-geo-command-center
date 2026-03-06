-- ============================================
-- PASTE THIS INTO SUPABASE SQL EDITOR
-- Citation & NAP Consistency (no DROP = no "destructive" warning)
-- Run this ONCE. If you need to re-run, use PASTE_IN_SUPABASE_CITATIONS.sql instead.
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- NAP PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS nap_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  location_id UUID NOT NULL UNIQUE REFERENCES locations(id) ON DELETE CASCADE,
  canonical_name TEXT NOT NULL,
  canonical_address TEXT NOT NULL,
  canonical_phone TEXT NOT NULL,
  canonical_website TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nap_profiles_agency ON nap_profiles(agency_id);
CREATE INDEX IF NOT EXISTS idx_nap_profiles_location ON nap_profiles(location_id);

-- ============================================
-- CITATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS citations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  directory_name TEXT NOT NULL,
  url TEXT,
  status TEXT NOT NULL CHECK (status IN ('present', 'missing', 'duplicate', 'incorrect')),
  nap_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_checked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_citations_agency ON citations(agency_id);
CREATE INDEX IF NOT EXISTS idx_citations_location ON citations(location_id);
CREATE INDEX IF NOT EXISTS idx_citations_client ON citations(client_id);
CREATE INDEX IF NOT EXISTS idx_citations_status ON citations(status);

-- ============================================
-- CITATION AUDITS
-- ============================================
CREATE TABLE IF NOT EXISTS citation_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  consistency_score INTEGER NOT NULL,
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citation_audits_agency ON citation_audits(agency_id);
CREATE INDEX IF NOT EXISTS idx_citation_audits_location ON citation_audits(location_id);
CREATE INDEX IF NOT EXISTS idx_citation_audits_created ON citation_audits(location_id, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE nap_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE citation_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members manage nap_profiles"
  ON nap_profiles FOR ALL
  USING (agency_id = get_user_agency_id() AND is_agency_member())
  WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());

CREATE POLICY "Clients read nap_profiles for their locations"
  ON nap_profiles FOR SELECT
  USING (location_id IN (SELECT id FROM locations WHERE client_id = get_user_client_id()));

CREATE POLICY "Agency members manage citations"
  ON citations FOR ALL
  USING (agency_id = get_user_agency_id() AND is_agency_member())
  WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());

CREATE POLICY "Clients read citations for their locations"
  ON citations FOR SELECT
  USING (location_id IN (SELECT id FROM locations WHERE client_id = get_user_client_id()));

CREATE POLICY "Agency members manage citation_audits"
  ON citation_audits FOR ALL
  USING (agency_id = get_user_agency_id() AND is_agency_member())
  WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());

CREATE POLICY "Clients read citation_audits for their locations"
  ON citation_audits FOR SELECT
  USING (location_id IN (SELECT id FROM locations WHERE client_id = get_user_client_id()));

-- ============================================
-- TRIGGER
-- ============================================
CREATE TRIGGER update_nap_profiles_updated_at
  BEFORE UPDATE ON nap_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE nap_profiles IS 'Canonical NAP per location for citation consistency';
COMMENT ON TABLE citations IS 'Directory citations with NAP snapshot and status';
COMMENT ON TABLE citation_audits IS 'Per-location NAP consistency score and issues';
