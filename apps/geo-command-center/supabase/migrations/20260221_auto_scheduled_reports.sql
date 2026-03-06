-- Auto-Scheduled White-Label Reports
-- Tables: report_templates, report_schedules, report_runs
-- Storage bucket: reports

-- ============================================
-- 1. REPORT TEMPLATES
-- ============================================
CREATE TABLE report_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_templates_agency ON report_templates(agency_id);

-- branding: { logo_url?: string, company_name?: string, accent_color?: string }
-- sections: array of section keys e.g. ["executive_summary", "location_breakdown", "roi_analysis"]

-- ============================================
-- 2. REPORT SCHEDULES
-- ============================================
CREATE TABLE report_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
  day_of_week INT,
  day_of_month INT,
  time_of_day TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- day_of_week: 0-6 (Sunday-Saturday) for weekly; NULL for monthly
-- day_of_month: 1-31 for monthly; NULL for weekly
-- time_of_day: HH:MM format (24h)
-- recipients: [{ email: string }]

CREATE INDEX idx_report_schedules_agency ON report_schedules(agency_id);
CREATE INDEX idx_report_schedules_client ON report_schedules(client_id);
CREATE INDEX idx_report_schedules_active ON report_schedules(is_active) WHERE is_active = TRUE;

-- ============================================
-- 3. REPORT RUNS
-- ============================================
CREATE TABLE report_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'generated', 'sent', 'failed')),
  pdf_path TEXT,
  summary JSONB DEFAULT '{}'::jsonb,
  run_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_runs_agency ON report_runs(agency_id);
CREATE INDEX idx_report_runs_client ON report_runs(client_id);
CREATE INDEX idx_report_runs_run_at ON report_runs(run_at);
CREATE INDEX idx_report_runs_status ON report_runs(status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_runs ENABLE ROW LEVEL SECURITY;

-- report_templates: admin/staff manage all in agency
CREATE POLICY "report_templates_agency_manage"
  ON report_templates FOR ALL
  USING (agency_id = get_user_agency_id() AND is_agency_member());

-- report_schedules: admin/staff manage all in agency
CREATE POLICY "report_schedules_agency_manage"
  ON report_schedules FOR ALL
  USING (agency_id = get_user_agency_id() AND is_agency_member());

-- report_runs: admin/staff manage all in agency; client read only their own
CREATE POLICY "report_runs_agency_manage"
  ON report_runs FOR ALL
  USING (agency_id = get_user_agency_id() AND is_agency_member());

CREATE POLICY "report_runs_client_read"
  ON report_runs FOR SELECT
  USING (client_id = get_user_client_id());

-- ============================================
-- STORAGE BUCKET
-- ============================================
-- Create bucket "reports" via Supabase Dashboard > Storage > New Bucket:
--   Name: reports, Public: false, Limit: 10MB, MIME: application/pdf
-- Path: {agency_id}/{client_id}/{run_id}.pdf
-- Cron uses service role to upload. Downloads via /api/reports/download (signed URL).
