-- Leads from AGS Contact Us and Book a Call forms
-- Funnels into Geo Command Center for admin users

-- ============================================
-- LEADS TABLE
-- ============================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('contact_form', 'scheduled_call')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business_name TEXT,
  message TEXT,
  -- For scheduled_call: preferred time slot and timezone
  preferred_time TEXT,
  timezone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_agency ON leads(agency_id);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Admin/staff can view leads for their agency
CREATE POLICY "Agency members view leads"
  ON leads FOR SELECT
  USING (agency_id = get_user_agency_id() AND is_agency_member());

-- Insert is done via service role from API (no user session)
-- No INSERT policy for authenticated users; API uses service role
