-- Create geo_scores table to store historical AI-powered GEO scores
CREATE TABLE IF NOT EXISTS geo_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  
  -- Score data
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  grade VARCHAR(10) NOT NULL,
  trend VARCHAR(20) NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  
  -- Breakdown scores
  ranking_score INTEGER NOT NULL,
  profile_score INTEGER NOT NULL,
  competitive_score INTEGER NOT NULL,
  signals_score INTEGER NOT NULL,
  
  -- Analysis (stored as JSONB for flexibility)
  strengths JSONB DEFAULT '[]'::jsonb,
  weaknesses JSONB DEFAULT '[]'::jsonb,
  opportunities JSONB DEFAULT '[]'::jsonb,
  threats JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  
  -- Factors used in calculation (for reference)
  factors JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_geo_scores_location_id ON geo_scores(location_id);
CREATE INDEX idx_geo_scores_calculated_at ON geo_scores(calculated_at DESC);
CREATE INDEX idx_geo_scores_overall_score ON geo_scores(overall_score DESC);

-- Add RLS policies
ALTER TABLE geo_scores ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view scores for locations in their agency
CREATE POLICY "Users can view geo scores for their agency's locations"
  ON geo_scores
  FOR SELECT
  USING (
    location_id IN (
      SELECT l.id
      FROM locations l
      INNER JOIN clients c ON l.client_id = c.id
      INNER JOIN profiles p ON c.agency_id = p.agency_id
      WHERE p.id = auth.uid()
    )
  );

-- Policy: Users can insert scores for locations in their agency
CREATE POLICY "Users can create geo scores for their agency's locations"
  ON geo_scores
  FOR INSERT
  WITH CHECK (
    location_id IN (
      SELECT l.id
      FROM locations l
      INNER JOIN clients c ON l.client_id = c.id
      INNER JOIN profiles p ON c.agency_id = p.agency_id
      WHERE p.id = auth.uid()
    )
  );

-- Add comments
COMMENT ON TABLE geo_scores IS 'AI-powered GEO scores for location performance tracking';
COMMENT ON COLUMN geo_scores.overall_score IS 'Total score from 0-100';
COMMENT ON COLUMN geo_scores.grade IS 'Letter grade (A+, A, B+, B, C+, C, D, F)';
COMMENT ON COLUMN geo_scores.trend IS 'Performance trend (improving, stable, declining, unknown)';
COMMENT ON COLUMN geo_scores.confidence IS 'AI confidence in the assessment (0-100)';
COMMENT ON COLUMN geo_scores.factors IS 'Input factors used for score calculation';
