-- Unified MEO/SEO/GEO scores with confidence model
-- GSC/GA4 OAuth token storage for ground-truth data

-- ============================================
-- 1. GSC/GA4 OAUTH TOKENS (per client or location)
-- ============================================
CREATE TABLE IF NOT EXISTS gsc_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gsc', 'ga4')),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  site_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- One token per agency+provider for now (client/location scoping can be added later)
CREATE UNIQUE INDEX idx_gsc_tokens_agency_provider ON gsc_oauth_tokens(agency_id, provider);

CREATE INDEX idx_gsc_tokens_agency ON gsc_oauth_tokens(agency_id);
CREATE INDEX idx_gsc_tokens_client ON gsc_oauth_tokens(client_id);
CREATE INDEX idx_gsc_tokens_location ON gsc_oauth_tokens(location_id);

-- ============================================
-- 2. UNIFIED SCORES (MEO/SEO/GEO + confidence)
-- ============================================
CREATE TABLE IF NOT EXISTS unified_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  -- Pillar scores 0-100
  meo_score INTEGER NOT NULL,
  seo_score INTEGER NOT NULL,
  geo_score INTEGER NOT NULL,
  overall_score INTEGER NOT NULL,
  final_score INTEGER NOT NULL,
  -- Confidence: high | medium | low
  score_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Structure: { meo: { confidence, breakdown }, seo: {...}, geo: {...} }
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_unified_scores_agency ON unified_scores(agency_id);
CREATE INDEX idx_unified_scores_client ON unified_scores(client_id);
CREATE INDEX idx_unified_scores_location ON unified_scores(location_id);
CREATE INDEX idx_unified_scores_calculated ON unified_scores(client_id, location_id, calculated_at DESC);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE gsc_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gsc_tokens_agency" ON gsc_oauth_tokens
  FOR ALL USING (agency_id = get_user_agency_id())
  WITH CHECK (agency_id = get_user_agency_id());

CREATE POLICY "unified_scores_agency" ON unified_scores
  FOR ALL USING (agency_id = get_user_agency_id())
  WITH CHECK (agency_id = get_user_agency_id());

CREATE POLICY "unified_scores_client_read" ON unified_scores
  FOR SELECT USING (
    client_id = get_user_client_id()
  );

-- ============================================
-- Add mention_position to ai_mentions evidence
-- (evidence JSONB already exists; we document the schema)
-- ============================================
COMMENT ON COLUMN ai_mentions.evidence IS 'JSONB: snippets, matched_terms, matched_types, mention_position (1-based rank in AI response)';
