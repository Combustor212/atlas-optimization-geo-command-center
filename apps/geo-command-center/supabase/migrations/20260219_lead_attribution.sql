-- Lead Attribution: lead_events, attribution_rules, lead_attributions
-- Classify lead/call events into channels (maps, organic, ai, direct, paid, referral)

-- ============================================
-- 1. LEAD_EVENTS
-- ============================================
CREATE TABLE lead_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('call', 'form', 'booking', 'direction', 'website_click')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  value NUMERIC,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_lead_events_agency ON lead_events(agency_id);
CREATE INDEX idx_lead_events_client ON lead_events(client_id);
CREATE INDEX idx_lead_events_location ON lead_events(location_id);
CREATE INDEX idx_lead_events_occurred ON lead_events(occurred_at DESC);
CREATE INDEX idx_lead_events_event_type ON lead_events(event_type);

-- ============================================
-- 2. ATTRIBUTION_RULES
-- ============================================
CREATE TABLE attribution_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('maps', 'organic', 'ai', 'direct', 'paid', 'referral')),
  match_criteria JSONB NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_attribution_rules_agency ON attribution_rules(agency_id);
CREATE INDEX idx_attribution_rules_active ON attribution_rules(agency_id, is_active) WHERE is_active = true;

-- ============================================
-- 3. LEAD_ATTRIBUTIONS
-- ============================================
CREATE TABLE lead_attributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  lead_event_id UUID NOT NULL REFERENCES lead_events(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('maps', 'organic', 'ai', 'direct', 'paid', 'referral')),
  confidence NUMERIC NOT NULL,
  attributed_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_attributions_agency ON lead_attributions(agency_id);
CREATE INDEX idx_lead_attributions_lead_event ON lead_attributions(lead_event_id);
CREATE INDEX idx_lead_attributions_channel ON lead_attributions(agency_id, channel);
CREATE INDEX idx_lead_attributions_created ON lead_attributions(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribution_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_attributions ENABLE ROW LEVEL SECURITY;

-- lead_events: admin/staff CRUD for agency; client read-only for their locations
CREATE POLICY "Agency members manage lead_events"
  ON lead_events FOR ALL
  USING (agency_id = get_user_agency_id() AND is_agency_member());

CREATE POLICY "Clients read lead_events for their locations"
  ON lead_events FOR SELECT
  USING (
    location_id IN (SELECT id FROM locations WHERE client_id = get_user_client_id())
  );

-- attribution_rules: admin/staff CRUD only (clients do not manage rules)
CREATE POLICY "Agency members manage attribution_rules"
  ON attribution_rules FOR ALL
  USING (agency_id = get_user_agency_id() AND is_agency_member());

CREATE POLICY "Agency members read attribution_rules"
  ON attribution_rules FOR SELECT
  USING (agency_id = get_user_agency_id());

-- lead_attributions: admin/staff CRUD; client read-only for their locations (via lead_event)
CREATE POLICY "Agency members manage lead_attributions"
  ON lead_attributions FOR ALL
  USING (agency_id = get_user_agency_id() AND is_agency_member());

CREATE POLICY "Clients read lead_attributions for their locations"
  ON lead_attributions FOR SELECT
  USING (
    lead_event_id IN (
      SELECT id FROM lead_events
      WHERE location_id IN (SELECT id FROM locations WHERE client_id = get_user_client_id())
    )
  );

COMMENT ON TABLE lead_events IS 'Lead/call events for attribution (call, form, booking, direction, website_click)';
COMMENT ON TABLE attribution_rules IS 'Rules to classify lead events into channels (maps, organic, ai, direct, paid, referral)';
COMMENT ON TABLE lead_attributions IS 'Attribution results per lead event with channel and confidence';
