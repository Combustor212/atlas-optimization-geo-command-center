-- Visibility Tracking Migration
-- Add Generative AI Visibility and Search Visibility tracking tables

-- ============================================
-- HELPER FUNCTION FOR AUTO-UPDATING updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GENERATIVE AI VISIBILITY METRICS
-- ============================================
-- Track visibility in AI-powered search results (ChatGPT, Gemini, Perplexity, etc.)
CREATE TABLE generative_ai_visibility (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  
  -- AI Platform Details
  platform TEXT NOT NULL, -- 'chatgpt', 'gemini', 'perplexity', 'claude', 'other'
  query_type TEXT NOT NULL, -- 'business_search', 'recommendation', 'comparison', 'informational'
  search_query TEXT NOT NULL, -- The actual query tested
  
  -- Visibility Metrics
  is_mentioned BOOLEAN DEFAULT FALSE, -- Whether business was mentioned at all
  mention_position INTEGER, -- Position in response (1 = first mentioned)
  mention_context TEXT, -- 'primary_recommendation', 'list', 'comparison', 'passing_mention'
  sentiment TEXT DEFAULT 'neutral', -- 'positive', 'neutral', 'negative'
  
  -- Content Analysis
  snippet TEXT, -- Actual text snippet from AI response
  competitors_mentioned TEXT[], -- Array of competitor names mentioned
  unique_details_count INTEGER DEFAULT 0, -- Number of unique business details mentioned
  
  -- Quality Scores
  visibility_score DECIMAL(5,2) DEFAULT 0, -- Overall visibility score (0-100)
  relevance_score DECIMAL(5,2) DEFAULT 0, -- How relevant the mention was (0-100)
  prominence_score DECIMAL(5,2) DEFAULT 0, -- How prominently featured (0-100)
  
  -- Metadata
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'manual', -- 'manual', 'api', 'automated'
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gen_ai_visibility_location ON generative_ai_visibility(location_id);
CREATE INDEX idx_gen_ai_visibility_platform ON generative_ai_visibility(platform);
CREATE INDEX idx_gen_ai_visibility_recorded ON generative_ai_visibility(recorded_at DESC);
CREATE INDEX idx_gen_ai_visibility_is_mentioned ON generative_ai_visibility(is_mentioned);

-- ============================================
-- SEARCH VISIBILITY METRICS
-- ============================================
-- Track traditional and enhanced search visibility metrics
CREATE TABLE search_visibility (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  
  -- Search Context
  keyword TEXT NOT NULL,
  search_type TEXT NOT NULL, -- 'local_pack', 'organic', 'featured_snippet', 'people_also_ask', 'knowledge_panel'
  device_type TEXT DEFAULT 'desktop', -- 'desktop', 'mobile', 'tablet'
  
  -- Position Metrics
  position INTEGER, -- Actual position (1-100+)
  is_visible BOOLEAN DEFAULT FALSE, -- Whether visible on first page
  page_number INTEGER DEFAULT 1, -- Which SERP page
  
  -- Enhanced Search Features
  has_featured_snippet BOOLEAN DEFAULT FALSE,
  has_knowledge_panel BOOLEAN DEFAULT FALSE,
  has_local_pack BOOLEAN DEFAULT FALSE,
  local_pack_position INTEGER, -- Position within local pack (1-3)
  has_image_pack BOOLEAN DEFAULT FALSE,
  has_video_result BOOLEAN DEFAULT FALSE,
  
  -- Business Profile Visibility
  gmb_shown BOOLEAN DEFAULT FALSE, -- Google My Business profile shown
  gmb_photos_count INTEGER DEFAULT 0,
  gmb_reviews_shown INTEGER DEFAULT 0,
  gmb_posts_shown INTEGER DEFAULT 0,
  
  -- SERP Features
  serp_features TEXT[], -- Array like ['reviews', 'hours', 'phone', 'directions', 'menu']
  rich_snippet_type TEXT, -- 'reviews', 'faq', 'how_to', 'product', etc.
  schema_markup_detected BOOLEAN DEFAULT FALSE,
  
  -- Competition Analysis
  total_competitors_shown INTEGER DEFAULT 0,
  competitors_above INTEGER DEFAULT 0, -- How many competitors rank above
  market_share_pct DECIMAL(5,2) DEFAULT 0, -- Estimated visibility share
  
  -- Visibility Scores
  overall_visibility_score DECIMAL(5,2) DEFAULT 0, -- Composite score (0-100)
  serp_dominance_score DECIMAL(5,2) DEFAULT 0, -- How much SERP real estate owned (0-100)
  
  -- Search Intent Match
  search_intent TEXT, -- 'navigational', 'informational', 'transactional', 'commercial'
  intent_match_score DECIMAL(5,2) DEFAULT 0, -- How well business matches intent (0-100)
  
  -- Geographic Data
  search_location TEXT, -- Location where search was performed
  distance_from_business DECIMAL(8,2), -- Miles/km from business location
  
  -- Metadata
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'manual', -- 'manual', 'api', 'serpapi', 'brightlocal', 'semrush'
  screenshot_url TEXT, -- URL to screenshot if captured
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_visibility_location ON search_visibility(location_id);
CREATE INDEX idx_search_visibility_keyword ON search_visibility(keyword);
CREATE INDEX idx_search_visibility_search_type ON search_visibility(search_type);
CREATE INDEX idx_search_visibility_recorded ON search_visibility(recorded_at DESC);
CREATE INDEX idx_search_visibility_position ON search_visibility(position);
CREATE INDEX idx_search_visibility_device ON search_visibility(device_type);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to calculate average AI visibility score for a location
CREATE OR REPLACE FUNCTION get_avg_ai_visibility_score(loc_id UUID, days INTEGER DEFAULT 30)
RETURNS DECIMAL AS $$
  SELECT COALESCE(AVG(visibility_score), 0)
  FROM generative_ai_visibility
  WHERE location_id = loc_id
    AND recorded_at >= NOW() - (days || ' days')::INTERVAL
    AND is_mentioned = TRUE;
$$ LANGUAGE SQL STABLE;

-- Function to calculate average search visibility score for a location
CREATE OR REPLACE FUNCTION get_avg_search_visibility_score(loc_id UUID, days INTEGER DEFAULT 30)
RETURNS DECIMAL AS $$
  SELECT COALESCE(AVG(overall_visibility_score), 0)
  FROM search_visibility
  WHERE location_id = loc_id
    AND recorded_at >= NOW() - (days || ' days')::INTERVAL;
$$ LANGUAGE SQL STABLE;

-- Function to get AI platform mention count
CREATE OR REPLACE FUNCTION get_ai_mention_count(loc_id UUID, days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM generative_ai_visibility
  WHERE location_id = loc_id
    AND recorded_at >= NOW() - (days || ' days')::INTERVAL
    AND is_mentioned = TRUE;
$$ LANGUAGE SQL STABLE;

-- Function to calculate SERP feature coverage percentage
CREATE OR REPLACE FUNCTION get_serp_feature_coverage(loc_id UUID, days INTEGER DEFAULT 30)
RETURNS DECIMAL AS $$
  WITH recent_searches AS (
    SELECT 
      has_featured_snippet,
      has_knowledge_panel,
      has_local_pack,
      has_image_pack,
      has_video_result
    FROM search_visibility
    WHERE location_id = loc_id
      AND recorded_at >= NOW() - (days || ' days')::INTERVAL
      AND is_visible = TRUE
  ),
  feature_counts AS (
    SELECT
      COUNT(*) as total_searches,
      SUM(CASE WHEN has_featured_snippet THEN 1 ELSE 0 END) as featured_count,
      SUM(CASE WHEN has_knowledge_panel THEN 1 ELSE 0 END) as knowledge_count,
      SUM(CASE WHEN has_local_pack THEN 1 ELSE 0 END) as local_count,
      SUM(CASE WHEN has_image_pack THEN 1 ELSE 0 END) as image_count,
      SUM(CASE WHEN has_video_result THEN 1 ELSE 0 END) as video_count
    FROM recent_searches
  )
  SELECT 
    CASE 
      WHEN total_searches = 0 THEN 0
      ELSE ((featured_count + knowledge_count + local_count + image_count + video_count)::DECIMAL / (total_searches * 5)) * 100
    END
  FROM feature_counts;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE generative_ai_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_visibility ENABLE ROW LEVEL SECURITY;

-- Policy for generative_ai_visibility
CREATE POLICY "Agency members can view AI visibility for their locations"
  ON generative_ai_visibility FOR SELECT
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      JOIN clients c ON l.client_id = c.id
      WHERE c.agency_id = get_user_agency_id()
    )
  );

CREATE POLICY "Agency members can insert AI visibility for their locations"
  ON generative_ai_visibility FOR INSERT
  WITH CHECK (
    location_id IN (
      SELECT l.id FROM locations l
      JOIN clients c ON l.client_id = c.id
      WHERE c.agency_id = get_user_agency_id()
    )
  );

CREATE POLICY "Agency members can update AI visibility for their locations"
  ON generative_ai_visibility FOR UPDATE
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      JOIN clients c ON l.client_id = c.id
      WHERE c.agency_id = get_user_agency_id()
    )
  );

CREATE POLICY "Clients can view AI visibility for their locations"
  ON generative_ai_visibility FOR SELECT
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      WHERE l.client_id = get_user_client_id()
    )
  );

-- Policy for search_visibility
CREATE POLICY "Agency members can view search visibility for their locations"
  ON search_visibility FOR SELECT
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      JOIN clients c ON l.client_id = c.id
      WHERE c.agency_id = get_user_agency_id()
    )
  );

CREATE POLICY "Agency members can insert search visibility for their locations"
  ON search_visibility FOR INSERT
  WITH CHECK (
    location_id IN (
      SELECT l.id FROM locations l
      JOIN clients c ON l.client_id = c.id
      WHERE c.agency_id = get_user_agency_id()
    )
  );

CREATE POLICY "Agency members can update search visibility for their locations"
  ON search_visibility FOR UPDATE
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      JOIN clients c ON l.client_id = c.id
      WHERE c.agency_id = get_user_agency_id()
    )
  );

CREATE POLICY "Clients can view search visibility for their locations"
  ON search_visibility FOR SELECT
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      WHERE l.client_id = get_user_client_id()
    )
  );

-- ============================================
-- AUTO-UPDATE TRIGGERS
-- ============================================

CREATE TRIGGER update_generative_ai_visibility_updated_at
  BEFORE UPDATE ON generative_ai_visibility
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_search_visibility_updated_at
  BEFORE UPDATE ON search_visibility
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE QUERIES
-- ============================================

-- Get AI visibility trend for a location
-- SELECT 
--   DATE_TRUNC('day', recorded_at) as date,
--   platform,
--   AVG(visibility_score) as avg_score,
--   COUNT(*) FILTER (WHERE is_mentioned) as mention_count
-- FROM generative_ai_visibility
-- WHERE location_id = 'YOUR-LOCATION-ID'
--   AND recorded_at >= NOW() - INTERVAL '30 days'
-- GROUP BY date, platform
-- ORDER BY date DESC;

-- Get search visibility breakdown by search type
-- SELECT
--   search_type,
--   AVG(overall_visibility_score) as avg_score,
--   AVG(position) as avg_position,
--   COUNT(*) FILTER (WHERE has_featured_snippet) as featured_count
-- FROM search_visibility
-- WHERE location_id = 'YOUR-LOCATION-ID'
--   AND recorded_at >= NOW() - INTERVAL '30 days'
-- GROUP BY search_type;

COMMENT ON TABLE generative_ai_visibility IS 'Track business visibility in AI-powered search results (ChatGPT, Gemini, Perplexity, etc.)';
COMMENT ON TABLE search_visibility IS 'Track comprehensive search visibility metrics including traditional rankings and SERP features';
