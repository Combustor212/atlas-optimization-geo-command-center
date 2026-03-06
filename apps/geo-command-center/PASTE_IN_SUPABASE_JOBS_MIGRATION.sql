-- =============================================================================
-- COPY EACH RUN BELOW, PASTE IN SUPABASE SQL EDITOR, RUN. DO RUN 1, THEN 2, THEN 3, THEN 4.
-- =============================================================================


-- =============================================================================
-- RUN 1
-- =============================================================================

ALTER TABLE locations ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE;
ALTER TABLE rankings ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE;
ALTER TABLE traffic_metrics ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE;
ALTER TABLE calls_tracked ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE;
ALTER TABLE revenue_estimates ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE;

UPDATE locations SET agency_id = c.agency_id FROM clients c WHERE locations.client_id = c.id AND locations.agency_id IS NULL;
UPDATE rankings SET agency_id = l.agency_id FROM locations l WHERE rankings.location_id = l.id AND rankings.agency_id IS NULL;
UPDATE traffic_metrics SET agency_id = l.agency_id FROM locations l WHERE traffic_metrics.location_id = l.id AND traffic_metrics.agency_id IS NULL;
UPDATE reviews SET agency_id = l.agency_id FROM locations l WHERE reviews.location_id = l.id AND reviews.agency_id IS NULL;
UPDATE calls_tracked SET agency_id = l.agency_id FROM locations l WHERE calls_tracked.location_id = l.id AND calls_tracked.agency_id IS NULL;
UPDATE revenue_estimates SET agency_id = l.agency_id FROM locations l WHERE revenue_estimates.location_id = l.id AND revenue_estimates.agency_id IS NULL;

ALTER TABLE locations ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE rankings ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE traffic_metrics ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE reviews ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE calls_tracked ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE revenue_estimates ALTER COLUMN agency_id SET NOT NULL;

DROP TRIGGER IF EXISTS trg_location_agency_id ON locations;
DROP TRIGGER IF EXISTS trg_rankings_agency_id ON rankings;
DROP TRIGGER IF EXISTS trg_traffic_metrics_agency_id ON traffic_metrics;
DROP TRIGGER IF EXISTS trg_reviews_agency_id ON reviews;
DROP TRIGGER IF EXISTS trg_calls_tracked_agency_id ON calls_tracked;
DROP TRIGGER IF EXISTS trg_revenue_estimates_agency_id ON revenue_estimates;

CREATE OR REPLACE FUNCTION set_location_agency_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.agency_id := (SELECT agency_id FROM clients WHERE id = NEW.client_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_location_agency_id
  BEFORE INSERT OR UPDATE OF client_id ON locations
  FOR EACH ROW EXECUTE FUNCTION set_location_agency_id();

CREATE OR REPLACE FUNCTION set_child_table_agency_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.agency_id := (SELECT agency_id FROM locations WHERE id = NEW.location_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rankings_agency_id
  BEFORE INSERT OR UPDATE OF location_id ON rankings
  FOR EACH ROW EXECUTE FUNCTION set_child_table_agency_id();

CREATE TRIGGER trg_traffic_metrics_agency_id
  BEFORE INSERT OR UPDATE OF location_id ON traffic_metrics
  FOR EACH ROW EXECUTE FUNCTION set_child_table_agency_id();

CREATE TRIGGER trg_reviews_agency_id
  BEFORE INSERT OR UPDATE OF location_id ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_child_table_agency_id();

CREATE TRIGGER trg_calls_tracked_agency_id
  BEFORE INSERT OR UPDATE OF location_id ON calls_tracked
  FOR EACH ROW EXECUTE FUNCTION set_child_table_agency_id();

CREATE TRIGGER trg_revenue_estimates_agency_id
  BEFORE INSERT OR UPDATE OF location_id ON revenue_estimates
  FOR EACH ROW EXECUTE FUNCTION set_child_table_agency_id();

CREATE INDEX IF NOT EXISTS idx_locations_agency_client ON locations(agency_id, client_id);
CREATE INDEX IF NOT EXISTS idx_rankings_agency_recorded ON rankings(agency_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_rankings_location_primary_recorded ON rankings(location_id, recorded_at DESC) WHERE keyword_type = 'primary';
CREATE INDEX IF NOT EXISTS idx_traffic_metrics_agency_location_recorded ON traffic_metrics(agency_id, location_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_agency_location_recorded ON reviews(agency_id, location_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_tracked_agency_location_recorded ON calls_tracked(agency_id, location_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_estimates_agency_location_calculated ON revenue_estimates(agency_id, location_id, calculated_at DESC);


-- =============================================================================
-- RUN 2
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
    CREATE TYPE job_status AS ENUM (
      'queued', 'running', 'succeeded', 'failed', 'retrying', 'canceled', 'dead'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_type') THEN
    CREATE TYPE job_type AS ENUM (
      'REPORT_RUN', 'AI_QUERY_RUN', 'RANK_REFRESH', 'PLACE_DETAILS_REFRESH', 'UPSELL_EVAL', 'HEALTH_SCORE_REFRESH'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  job_type job_type NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status job_status NOT NULL DEFAULT 'queued',
  priority INT NOT NULL DEFAULT 0,
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  idempotency_key TEXT NOT NULL UNIQUE,
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  attempt_no INT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status job_status NOT NULL,
  error TEXT,
  logs JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_run_at ON jobs(status, run_at);
CREATE INDEX IF NOT EXISTS idx_jobs_type_status_run_at ON jobs(job_type, status, run_at);
CREATE INDEX IF NOT EXISTS idx_jobs_agency_status_run_at ON jobs(agency_id, status, run_at);
CREATE INDEX IF NOT EXISTS idx_job_runs_job ON job_runs(job_id);


-- =============================================================================
-- RUN 3
-- =============================================================================

CREATE OR REPLACE FUNCTION public.claim_jobs(worker_id TEXT, limit_n INT DEFAULT 5)
RETURNS SETOF jobs
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  WITH to_claim AS (
    SELECT j.id FROM jobs j
    WHERE j.status = 'queued' AND j.run_at <= now()
    ORDER BY j.priority DESC, j.run_at ASC
    LIMIT limit_n
    FOR UPDATE OF j SKIP LOCKED
  )
  UPDATE jobs j
  SET
    status = 'running',
    locked_at = now(),
    locked_by = worker_id,
    attempts = j.attempts + 1,
    updated_at = now()
  FROM to_claim t
  WHERE j.id = t.id
  RETURNING j.*;
END;
$$;


-- =============================================================================
-- RUN 4
-- =============================================================================

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jobs_select_agency" ON jobs;
CREATE POLICY "jobs_select_agency"
  ON jobs FOR SELECT
  USING (agency_id = get_user_agency_id());

DROP POLICY IF EXISTS "jobs_insert_agency_member" ON jobs;
CREATE POLICY "jobs_insert_agency_member"
  ON jobs FOR INSERT
  WITH CHECK (
    agency_id = get_user_agency_id() AND is_agency_member()
  );

DROP POLICY IF EXISTS "job_runs_select_via_job" ON job_runs;
CREATE POLICY "job_runs_select_via_job"
  ON job_runs FOR SELECT
  USING (
    job_id IN (SELECT id FROM jobs WHERE agency_id = get_user_agency_id())
  );
