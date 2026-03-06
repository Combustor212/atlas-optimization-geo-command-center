-- AI Mention Tracking (Manual Assisted Capture)
-- Tables: ai_queries, ai_query_runs, ai_mentions
-- No scraping; staff pastes AI response text; server extracts mentions by rules + optional OpenAI sentiment

-- ============================================
-- 1. AI_QUERIES
-- ============================================
CREATE TABLE ai_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('chatgpt', 'gemini', 'perplexity', 'claude')),
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_queries_agency ON ai_queries(agency_id);
CREATE INDEX idx_ai_queries_location ON ai_queries(location_id);
CREATE INDEX idx_ai_queries_active ON ai_queries(agency_id, is_active) WHERE is_active = true;

-- ============================================
-- 2. AI_QUERY_RUNS
-- ============================================
CREATE TABLE ai_query_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  ai_query_id UUID NOT NULL REFERENCES ai_queries(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'completed', 'failed')),
  ran_at TIMESTAMPTZ DEFAULT NOW(),
  raw_text TEXT,
  extracted JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_query_runs_agency ON ai_query_runs(agency_id);
CREATE INDEX idx_ai_query_runs_query ON ai_query_runs(ai_query_id);
CREATE INDEX idx_ai_query_runs_status ON ai_query_runs(agency_id, status) WHERE status = 'queued';
CREATE INDEX idx_ai_query_runs_ran_at ON ai_query_runs(ran_at DESC);

-- ============================================
-- 3. AI_MENTIONS
-- ============================================
CREATE TABLE ai_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  mention_count INTEGER NOT NULL,
  visibility_score INTEGER NOT NULL,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  evidence JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_mentions_agency ON ai_mentions(agency_id);
CREATE INDEX idx_ai_mentions_location ON ai_mentions(location_id);
CREATE INDEX idx_ai_mentions_captured ON ai_mentions(location_id, captured_at DESC);
CREATE INDEX idx_ai_mentions_platform ON ai_mentions(location_id, platform, captured_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE ai_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_query_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_mentions ENABLE ROW LEVEL SECURITY;

-- ai_queries: admin/staff manage; client no direct access (managed via agency)
CREATE POLICY "Agency members can manage ai_queries"
  ON ai_queries
  FOR ALL
  USING (agency_id = get_user_agency_id())
  WITH CHECK (agency_id = get_user_agency_id());

-- ai_query_runs: admin/staff manage
CREATE POLICY "Agency members can manage ai_query_runs"
  ON ai_query_runs
  FOR ALL
  USING (agency_id = get_user_agency_id())
  WITH CHECK (agency_id = get_user_agency_id());

-- ai_mentions: admin/staff full access; client read-only for their locations
CREATE POLICY "Agency members can manage ai_mentions"
  ON ai_mentions
  FOR ALL
  USING (agency_id = get_user_agency_id())
  WITH CHECK (agency_id = get_user_agency_id());

CREATE POLICY "Clients can view ai_mentions for their locations"
  ON ai_mentions
  FOR SELECT
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      WHERE l.client_id = get_user_client_id()
    )
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE ai_queries IS 'Saved AI search queries to run periodically (manual paste workflow)';
COMMENT ON TABLE ai_query_runs IS 'Queued/completed runs; staff pastes raw AI response text';
COMMENT ON TABLE ai_mentions IS 'Extracted mention metrics per run: count, visibility score, sentiment, evidence';
