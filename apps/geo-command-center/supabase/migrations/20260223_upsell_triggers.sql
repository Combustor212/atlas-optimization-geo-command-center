-- Upsell Trigger Engine
-- Tables: upsell_triggers, upsell_opportunities
-- RLS: admin/staff only; clients cannot see upsells

-- ============================================
-- UPSELL TRIGGERS
-- ============================================
CREATE TABLE upsell_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  condition JSONB NOT NULL,
  offer_type TEXT NOT NULL CHECK (offer_type IN ('ads', 'cro', 'content', 'reputation', 'ai_pr', 'other')),
  message_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_upsell_triggers_agency ON upsell_triggers(agency_id);
CREATE INDEX idx_upsell_triggers_agency_active ON upsell_triggers(agency_id, is_active) WHERE is_active = true;

-- ============================================
-- UPSELL OPPORTUNITIES
-- ============================================
CREATE TABLE upsell_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  trigger_id UUID NOT NULL REFERENCES upsell_triggers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'contacted', 'won', 'lost', 'dismissed')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_upsell_opportunities_agency ON upsell_opportunities(agency_id);
CREATE INDEX idx_upsell_opportunities_client ON upsell_opportunities(client_id);
CREATE INDEX idx_upsell_opportunities_trigger ON upsell_opportunities(trigger_id);
CREATE INDEX idx_upsell_opportunities_status ON upsell_opportunities(status);
-- Prevent duplicate open opportunities per client/location/trigger (NULL location_id treated as distinct)
CREATE UNIQUE INDEX idx_upsell_opportunities_open_unique ON upsell_opportunities(
  client_id, COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid), trigger_id
) WHERE status = 'open';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE upsell_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE upsell_opportunities ENABLE ROW LEVEL SECURITY;

-- Admin/staff only; clients cannot see
CREATE POLICY "Agency members manage upsell triggers"
  ON upsell_triggers FOR ALL
  USING (agency_id = get_user_agency_id() AND is_agency_member())
  WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());

CREATE POLICY "Agency members manage upsell opportunities"
  ON upsell_opportunities FOR ALL
  USING (agency_id = get_user_agency_id() AND is_agency_member())
  WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());

-- ============================================
-- TRIGGER: updated_at for opportunities
-- ============================================
CREATE TRIGGER upsell_opportunities_updated
  BEFORE UPDATE ON upsell_opportunities
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
