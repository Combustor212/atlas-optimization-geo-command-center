-- Revenue Impact Calculator Migration
-- Adds revenue tracking and impact calculation for clients

-- ============================================
-- 1. ALTER CLIENTS TABLE
-- Add revenue calculation configuration fields
-- ============================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS service_start_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS baseline_method TEXT NOT NULL DEFAULT 'AVG_PRE_3';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS baseline_revenue_manual NUMERIC;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gross_margin_pct NUMERIC NOT NULL DEFAULT 0.30;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS attribution_pct NUMERIC NOT NULL DEFAULT 1.0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS exclude_partial_first_month BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS count_only_positive_lift BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS treat_missing_month_as_zero BOOLEAN NOT NULL DEFAULT false;

-- Add constraint for baseline_method values
ALTER TABLE clients ADD CONSTRAINT check_baseline_method 
  CHECK (baseline_method IN ('AVG_PRE_3', 'AVG_PRE_6', 'SINGLE_PRE_1', 'MANUAL'));

-- Add constraint for baseline_revenue_manual when MANUAL method is used
-- This is a soft constraint - will be validated in the application layer

COMMENT ON COLUMN clients.service_start_date IS 'Date when SEO/MEO/GEO services started for this client';
COMMENT ON COLUMN clients.currency IS 'Currency code (e.g., USD, EUR, GBP)';
COMMENT ON COLUMN clients.baseline_method IS 'Method to calculate baseline revenue: AVG_PRE_3, AVG_PRE_6, SINGLE_PRE_1, MANUAL';
COMMENT ON COLUMN clients.baseline_revenue_manual IS 'Manual baseline monthly revenue (required if baseline_method=MANUAL)';
COMMENT ON COLUMN clients.gross_margin_pct IS 'Gross margin percentage stored as decimal (0.30 = 30%)';
COMMENT ON COLUMN clients.attribution_pct IS 'Percentage of lift attributed to SEO/MEO/GEO stored as decimal (1.0 = 100%)';
COMMENT ON COLUMN clients.exclude_partial_first_month IS 'Whether to exclude the first partial month from calculations';
COMMENT ON COLUMN clients.count_only_positive_lift IS 'Whether to count only positive revenue lift in totals';
COMMENT ON COLUMN clients.treat_missing_month_as_zero IS 'Whether to treat missing months as zero revenue';

-- ============================================
-- 2. CREATE CLIENT_REVENUE_MONTHLY TABLE
-- Tracks monthly revenue for each client
-- ============================================
CREATE TABLE IF NOT EXISTS client_revenue_monthly (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  month DATE NOT NULL,  -- Store as first day of month (YYYY-MM-01)
  revenue NUMERIC NOT NULL CHECK (revenue >= 0),
  source TEXT NOT NULL DEFAULT 'MANUAL',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT client_revenue_monthly_unique_month UNIQUE (client_id, month)
);

-- Add constraint for source values
ALTER TABLE client_revenue_monthly ADD CONSTRAINT check_revenue_source 
  CHECK (source IN ('MANUAL', 'QB', 'STRIPE', 'SQUARE', 'SHOPIFY', 'OTHER'));

COMMENT ON TABLE client_revenue_monthly IS 'Monthly revenue tracking for revenue impact calculations';
COMMENT ON COLUMN client_revenue_monthly.month IS 'First day of the month (YYYY-MM-01 format)';
COMMENT ON COLUMN client_revenue_monthly.revenue IS 'Total revenue for the month';
COMMENT ON COLUMN client_revenue_monthly.source IS 'Source of revenue data: MANUAL, QB, STRIPE, SQUARE, SHOPIFY, OTHER';
COMMENT ON COLUMN client_revenue_monthly.notes IS 'Optional notes about the revenue entry';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_client_revenue_client_month 
  ON client_revenue_monthly(client_id, month);
CREATE INDEX IF NOT EXISTS idx_client_revenue_agency 
  ON client_revenue_monthly(agency_id);
CREATE INDEX IF NOT EXISTS idx_client_revenue_month 
  ON client_revenue_monthly(month);

-- ============================================
-- 3. ROW LEVEL SECURITY FOR CLIENT_REVENUE_MONTHLY
-- ============================================
ALTER TABLE client_revenue_monthly ENABLE ROW LEVEL SECURITY;

-- Agency members can see all revenue for their agency's clients
CREATE POLICY "Agency members see client revenue"
  ON client_revenue_monthly FOR SELECT
  USING (agency_id = get_user_agency_id());

-- Agency members can insert revenue for their clients
CREATE POLICY "Agency members insert client revenue"
  ON client_revenue_monthly FOR INSERT
  WITH CHECK (
    agency_id = get_user_agency_id() 
    AND client_id IN (SELECT id FROM clients WHERE agency_id = get_user_agency_id())
  );

-- Agency members can update revenue for their clients
CREATE POLICY "Agency members update client revenue"
  ON client_revenue_monthly FOR UPDATE
  USING (agency_id = get_user_agency_id())
  WITH CHECK (agency_id = get_user_agency_id());

-- Agency members can delete revenue for their clients
CREATE POLICY "Agency members delete client revenue"
  ON client_revenue_monthly FOR DELETE
  USING (agency_id = get_user_agency_id());

-- ============================================
-- 4. TRIGGER FOR UPDATED_AT
-- ============================================
CREATE TRIGGER client_revenue_monthly_updated 
  BEFORE UPDATE ON client_revenue_monthly
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ============================================
-- 5. RPC FUNCTION: calculate_client_revenue_impact
-- Calculates revenue impact metrics for a client
-- ============================================
CREATE OR REPLACE FUNCTION calculate_client_revenue_impact(client_uuid UUID)
RETURNS TABLE (
  baseline_monthly_revenue NUMERIC,
  current_month_revenue NUMERIC,
  total_incremental_revenue NUMERIC,
  attributed_incremental_revenue NUMERIC,
  incremental_profit NUMERIC,
  revenue_growth_pct NUMERIC,
  avg_monthly_lift NUMERIC,
  trailing3_after_avg NUMERIC,
  trailing3_lift NUMERIC,
  months_included INTEGER,
  months JSONB
) AS $$
DECLARE
  client_rec RECORD;
  revenue_entries RECORD;
  baseline NUMERIC := 0;
  pre_months_data NUMERIC[];
  after_months_data JSONB := '[]'::JSONB;
  current_revenue NUMERIC := 0;
  total_lift NUMERIC := 0;
  month_count INTEGER := 0;
  trailing3_sum NUMERIC := 0;
  trailing3_count INTEGER := 0;
  start_month_date DATE;
BEGIN
  -- Get client configuration
  SELECT * INTO client_rec FROM clients WHERE id = client_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found';
  END IF;
  
  IF client_rec.service_start_date IS NULL THEN
    RAISE EXCEPTION 'Client service_start_date is required';
  END IF;
  
  -- Calculate start month (first day of the month)
  start_month_date := DATE_TRUNC('month', client_rec.service_start_date)::DATE;
  
  -- Calculate baseline revenue based on method
  IF client_rec.baseline_method = 'MANUAL' THEN
    baseline := COALESCE(client_rec.baseline_revenue_manual, 0);
  ELSE
    -- Get pre-start revenue entries
    SELECT ARRAY_AGG(revenue ORDER BY month DESC) INTO pre_months_data
    FROM client_revenue_monthly
    WHERE client_id = client_uuid
      AND month < start_month_date
    ORDER BY month DESC
    LIMIT CASE 
      WHEN client_rec.baseline_method = 'AVG_PRE_6' THEN 6
      WHEN client_rec.baseline_method = 'AVG_PRE_3' THEN 3
      WHEN client_rec.baseline_method = 'SINGLE_PRE_1' THEN 1
      ELSE 3
    END;
    
    -- Calculate baseline
    IF pre_months_data IS NOT NULL AND array_length(pre_months_data, 1) > 0 THEN
      IF client_rec.baseline_method = 'SINGLE_PRE_1' THEN
        baseline := pre_months_data[1];
      ELSE
        -- Average of available pre-start months
        SELECT AVG(unnest) INTO baseline FROM unnest(pre_months_data);
      END IF;
    END IF;
  END IF;
  
  -- Process after-start months
  FOR revenue_entries IN
    SELECT month, revenue
    FROM client_revenue_monthly
    WHERE client_id = client_uuid
      AND month >= start_month_date
      AND (NOT client_rec.exclude_partial_first_month OR month > start_month_date OR DATE_PART('day', client_rec.service_start_date) = 1)
    ORDER BY month ASC
  LOOP
    DECLARE
      delta NUMERIC;
      delta_pct NUMERIC;
      attributed_delta NUMERIC;
      profit_delta NUMERIC;
    BEGIN
      delta := revenue_entries.revenue - baseline;
      delta_pct := CASE WHEN baseline > 0 THEN (delta / baseline) * 100 ELSE 0 END;
      attributed_delta := delta * client_rec.attribution_pct;
      profit_delta := attributed_delta * client_rec.gross_margin_pct;
      
      -- Add to monthly breakdown
      after_months_data := after_months_data || jsonb_build_object(
        'month', revenue_entries.month,
        'revenue', revenue_entries.revenue,
        'baseline', baseline,
        'delta', delta,
        'delta_pct', delta_pct,
        'attributed_delta', attributed_delta,
        'profit_delta', profit_delta
      );
      
      -- Update totals
      IF client_rec.count_only_positive_lift THEN
        total_lift := total_lift + GREATEST(delta, 0);
      ELSE
        total_lift := total_lift + delta;
      END IF;
      
      month_count := month_count + 1;
      current_revenue := revenue_entries.revenue;
      
      -- Track last 3 months for trailing average
      IF month_count > (jsonb_array_length(after_months_data) - 3) THEN
        trailing3_sum := trailing3_sum + revenue_entries.revenue;
        trailing3_count := trailing3_count + 1;
      END IF;
    END;
  END LOOP;
  
  -- Calculate final metrics
  RETURN QUERY SELECT
    baseline,
    current_revenue,
    total_lift,
    total_lift * client_rec.attribution_pct,
    (total_lift * client_rec.attribution_pct * client_rec.gross_margin_pct),
    CASE WHEN baseline > 0 THEN ((current_revenue - baseline) / baseline) * 100 ELSE 0 END,
    CASE WHEN month_count > 0 THEN total_lift / month_count ELSE 0 END,
    CASE WHEN trailing3_count > 0 THEN trailing3_sum / trailing3_count ELSE 0 END,
    CASE WHEN trailing3_count > 0 THEN (trailing3_sum / trailing3_count) - baseline ELSE 0 END,
    month_count,
    after_months_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_client_revenue_impact IS 'Calculates revenue impact metrics for a client based on monthly revenue data and configuration';
