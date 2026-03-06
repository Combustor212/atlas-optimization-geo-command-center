-- Google Calendar OAuth tokens (admin connects once per agency)
-- Bookings table for Book a Call flow

-- ============================================
-- 1. GOOGLE CALENDAR OAUTH TOKENS
-- ============================================
CREATE TABLE IF NOT EXISTS google_calendar_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id)
);

CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_agency ON google_calendar_oauth_tokens(agency_id);

ALTER TABLE google_calendar_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Only agency admins/staff can manage (service role used for server-side booking)
CREATE POLICY "google_calendar_tokens_agency" ON google_calendar_oauth_tokens
  FOR ALL USING (agency_id = get_user_agency_id())
  WITH CHECK (agency_id = get_user_agency_id());

-- ============================================
-- 2. BOOKINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  google_event_id TEXT,
  google_meet_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_agency ON bookings(agency_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings_agency" ON bookings
  FOR ALL USING (agency_id = get_user_agency_id())
  WITH CHECK (agency_id = get_user_agency_id());
