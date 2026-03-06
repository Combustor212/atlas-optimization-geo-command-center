-- GEO Command Center - Production Schema
-- Scalable to 500+ clients with clean agency separation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE user_role AS ENUM ('admin', 'staff', 'client');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing');
CREATE TYPE payment_type AS ENUM ('subscription', 'setup', 'one_time');

-- ============================================
-- 1. AGENCIES
-- ============================================
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agencies_slug ON agencies(slug);
CREATE INDEX idx_agencies_stripe ON agencies(stripe_customer_id);

-- ============================================
-- 2. CLIENTS
-- ============================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business_name TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, email)
);

CREATE INDEX idx_clients_agency ON clients(agency_id);
CREATE INDEX idx_clients_email ON clients(email);

-- ============================================
-- 3. LOCATIONS
-- ============================================
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  business_type TEXT,
  avg_repair_ticket DECIMAL(12,2) DEFAULT 0,
  avg_daily_jobs DECIMAL(8,2) DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 20.00,
  place_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_locations_client ON locations(client_id);

-- ============================================
-- 4. SUBSCRIPTIONS (Stripe synced)
-- ============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status subscription_status DEFAULT 'active',
  mrr DECIMAL(12,2) DEFAULT 0,
  interval TEXT DEFAULT 'month',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_agency ON subscriptions(agency_id);
CREATE INDEX idx_subscriptions_client ON subscriptions(client_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ============================================
-- 5. PAYMENTS
-- ============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  stripe_payment_id TEXT UNIQUE,
  amount DECIMAL(12,2) NOT NULL,
  type payment_type NOT NULL,
  description TEXT,
  paid_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_agency ON payments(agency_id);
CREATE INDEX idx_payments_client ON payments(client_id);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);
CREATE INDEX idx_payments_type ON payments(type);

-- ============================================
-- 6. RANKINGS (GEO / Local Falcon)
-- ============================================
CREATE TABLE rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  keyword_type TEXT DEFAULT 'primary', -- primary, secondary
  map_pack_position INTEGER,
  organic_position INTEGER,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT DEFAULT 'manual' -- manual, local_falcon, api
);

CREATE INDEX idx_rankings_location ON rankings(location_id);
CREATE INDEX idx_rankings_recorded ON rankings(recorded_at);
CREATE INDEX idx_rankings_location_keyword ON rankings(location_id, keyword, recorded_at DESC);

-- ============================================
-- 7. TRAFFIC_METRICS (GSC / GA4)
-- ============================================
CREATE TABLE traffic_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  organic_clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr DECIMAL(6,2) DEFAULT 0,
  recorded_at DATE NOT NULL,
  source TEXT DEFAULT 'gsc' -- gsc, ga4
);

CREATE INDEX idx_traffic_location ON traffic_metrics(location_id);
CREATE INDEX idx_traffic_recorded ON traffic_metrics(recorded_at);
CREATE UNIQUE INDEX idx_traffic_location_date ON traffic_metrics(location_id, recorded_at, source);

-- ============================================
-- 8. REVENUE_ESTIMATES
-- ============================================
CREATE TABLE revenue_estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  estimated_monthly_lift DECIMAL(12,2) DEFAULT 0,
  rank_improvement INTEGER DEFAULT 0,
  traffic_increase_pct DECIMAL(5,2) DEFAULT 0,
  ctr_lift DECIMAL(5,2) DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_revenue_location ON revenue_estimates(location_id);
CREATE INDEX idx_revenue_calculated ON revenue_estimates(calculated_at);

-- ============================================
-- 9. REVIEWS
-- ============================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  count INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  recorded_at DATE NOT NULL,
  source TEXT DEFAULT 'manual'
);

CREATE INDEX idx_reviews_location ON reviews(location_id);
CREATE INDEX idx_reviews_recorded ON reviews(recorded_at);

-- ============================================
-- 10. CALLS_TRACKED
-- ============================================
CREATE TABLE calls_tracked (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  call_count INTEGER DEFAULT 0,
  recorded_at DATE NOT NULL,
  source TEXT DEFAULT 'manual'
);

CREATE INDEX idx_calls_location ON calls_tracked(location_id);
CREATE INDEX idx_calls_recorded ON calls_tracked(recorded_at);

-- ============================================
-- USER PROFILES (links Supabase Auth to agencies/clients)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  role user_role NOT NULL DEFAULT 'staff',
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_agency ON profiles(agency_id);
CREATE INDEX idx_profiles_client ON profiles(client_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls_tracked ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's agency_id
CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS UUID AS $$
  SELECT agency_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: get current user's client_id
CREATE OR REPLACE FUNCTION get_user_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: is admin or staff
CREATE OR REPLACE FUNCTION is_agency_member()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  )
$$ LANGUAGE sql SECURITY DEFINER;

-- Agency policies
CREATE POLICY "Agency members can manage their agency"
  ON agencies FOR ALL USING (id = get_user_agency_id() OR is_agency_member());

-- Client policies
CREATE POLICY "Agency members see agency clients"
  ON clients FOR SELECT USING (agency_id = get_user_agency_id());
CREATE POLICY "Clients see own record"
  ON clients FOR SELECT USING (id = get_user_client_id());
CREATE POLICY "Agency admins manage clients"
  ON clients FOR ALL USING (agency_id = get_user_agency_id() AND is_agency_member());

-- Location policies (through client)
CREATE POLICY "Agency members see client locations"
  ON locations FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE agency_id = get_user_agency_id())
  );
CREATE POLICY "Clients see own locations"
  ON locations FOR SELECT USING (
    client_id = get_user_client_id()
  );
CREATE POLICY "Agency manages locations"
  ON locations FOR ALL USING (
    client_id IN (SELECT id FROM clients WHERE agency_id = get_user_agency_id()) AND is_agency_member()
  );

-- Similar RLS for other tables...
CREATE POLICY "Subscriptions by agency"
  ON subscriptions FOR ALL USING (agency_id = get_user_agency_id());
CREATE POLICY "Payments by agency"
  ON payments FOR ALL USING (agency_id = get_user_agency_id());
CREATE POLICY "Rankings via location"
  ON rankings FOR ALL USING (
    location_id IN (SELECT l.id FROM locations l JOIN clients c ON l.client_id = c.id WHERE c.agency_id = get_user_agency_id() OR c.id = get_user_client_id())
  );
CREATE POLICY "Traffic via location"
  ON traffic_metrics FOR ALL USING (
    location_id IN (SELECT l.id FROM locations l JOIN clients c ON l.client_id = c.id WHERE c.agency_id = get_user_agency_id() OR c.id = get_user_client_id())
  );
CREATE POLICY "Revenue estimates via location"
  ON revenue_estimates FOR ALL USING (
    location_id IN (SELECT l.id FROM locations l JOIN clients c ON l.client_id = c.id WHERE c.agency_id = get_user_agency_id() OR c.id = get_user_client_id())
  );
CREATE POLICY "Reviews via location"
  ON reviews FOR ALL USING (
    location_id IN (SELECT l.id FROM locations l JOIN clients c ON l.client_id = c.id WHERE c.agency_id = get_user_agency_id() OR c.id = get_user_client_id())
  );
CREATE POLICY "Calls via location"
  ON calls_tracked FOR ALL USING (
    location_id IN (SELECT l.id FROM locations l JOIN clients c ON l.client_id = c.id WHERE c.agency_id = get_user_agency_id() OR c.id = get_user_client_id())
  );
CREATE POLICY "Profiles own or agency"
  ON profiles FOR ALL USING (id = (SELECT auth.uid()) OR agency_id = get_user_agency_id());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'staff');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agencies_updated BEFORE UPDATE ON agencies
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER clients_updated BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER locations_updated BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER subscriptions_updated BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
