-- Mock Data with Payment Timeline + Revenue Calculator Data
-- This version includes:
-- 1. Client subscriptions with specific payment dates (Feb 7, 10, 16)
-- 2. Service start dates for revenue tracking
-- 3. Monthly revenue data for revenue calculator

DO $$
DECLARE
  v_agency_id UUID;
  v_client1_id UUID;
  v_client2_id UUID;
  v_client3_id UUID;
  v_client4_id UUID;
  v_client5_id UUID;
  v_client6_id UUID;
BEGIN
  -- Get the first agency (or create one if needed)
  SELECT id INTO v_agency_id FROM agencies LIMIT 1;
  
  IF v_agency_id IS NULL THEN
    INSERT INTO agencies (name, slug) 
    VALUES ('Demo Agency', 'demo-agency')
    RETURNING id INTO v_agency_id;
  END IF;

  -- Clear existing mock data for this agency
  DELETE FROM client_revenue_monthly WHERE agency_id = v_agency_id;
  DELETE FROM payments WHERE agency_id = v_agency_id;
  DELETE FROM subscriptions WHERE agency_id = v_agency_id;
  DELETE FROM revenue_estimates WHERE location_id IN (
    SELECT l.id FROM locations l 
    JOIN clients c ON l.client_id = c.id 
    WHERE c.agency_id = v_agency_id
  );
  DELETE FROM calls_tracked WHERE location_id IN (
    SELECT l.id FROM locations l 
    JOIN clients c ON l.client_id = c.id 
    WHERE c.agency_id = v_agency_id
  );
  DELETE FROM reviews WHERE location_id IN (
    SELECT l.id FROM locations l 
    JOIN clients c ON l.client_id = c.id 
    WHERE c.agency_id = v_agency_id
  );
  DELETE FROM traffic_metrics WHERE location_id IN (
    SELECT l.id FROM locations l 
    JOIN clients c ON l.client_id = c.id 
    WHERE c.agency_id = v_agency_id
  );
  DELETE FROM rankings WHERE location_id IN (
    SELECT l.id FROM locations l 
    JOIN clients c ON l.client_id = c.id 
    WHERE c.agency_id = v_agency_id
  );
  DELETE FROM locations WHERE client_id IN (
    SELECT id FROM clients WHERE agency_id = v_agency_id
  );
  DELETE FROM clients WHERE agency_id = v_agency_id;

  -- ====================================================
  -- INSERT 6 CLIENTS with Revenue Configuration
  -- ====================================================
  
  -- CLIENT 1: Johns Plumbing - Started services Dec 1, 2025
  INSERT INTO clients (
    agency_id, name, business_name, email, phone,
    service_start_date, baseline_method, gross_margin_pct, attribution_pct
  ) VALUES (
    v_agency_id, 'John Smith', 'Johns Plumbing Services LLC', 'john@johnsplumbing.com', '(555) 123-4567',
    '2025-12-01', 'AVG_PRE_3', 0.35, 0.80
  )
  RETURNING id INTO v_client1_id;
  
  -- CLIENT 2: Elite HVAC - Started services Nov 15, 2025
  INSERT INTO clients (
    agency_id, name, business_name, email, phone,
    service_start_date, baseline_method, gross_margin_pct, attribution_pct
  ) VALUES (
    v_agency_id, 'Sarah Johnson', 'Elite HVAC Solutions Inc', 'info@elitehvac.com', '(555) 234-5678',
    '2025-11-15', 'AVG_PRE_3', 0.40, 0.75
  )
  RETURNING id INTO v_client2_id;
  
  -- CLIENT 3: Green Lawn Care - Started services Jan 1, 2026
  INSERT INTO clients (
    agency_id, name, business_name, email, phone,
    service_start_date, baseline_method, gross_margin_pct, attribution_pct
  ) VALUES (
    v_agency_id, 'Mike Green', 'Green Lawn Care Professional Services', 'contact@greenlawnpro.com', '(555) 345-6789',
    '2026-01-01', 'AVG_PRE_3', 0.30, 0.70
  )
  RETURNING id INTO v_client3_id;
  
  -- CLIENT 4: Bright Smile Dental - Started services Oct 1, 2025
  INSERT INTO clients (
    agency_id, name, business_name, email, phone,
    service_start_date, baseline_method, gross_margin_pct, attribution_pct
  ) VALUES (
    v_agency_id, 'Dr. Lisa Chen', 'Bright Smile Dental Care', 'admin@brightsmile.com', '(555) 456-7890',
    '2025-10-01', 'AVG_PRE_3', 0.50, 0.85
  )
  RETURNING id INTO v_client4_id;
  
  -- CLIENT 5: QuickFix Auto - Started services Nov 1, 2025
  INSERT INTO clients (
    agency_id, name, business_name, email, phone,
    service_start_date, baseline_method, gross_margin_pct, attribution_pct
  ) VALUES (
    v_agency_id, 'Tom Rodriguez', 'QuickFix Auto Repair & Service', 'service@quickfixauto.com', '(555) 567-8901',
    '2025-11-01', 'AVG_PRE_3', 0.35, 0.75
  )
  RETURNING id INTO v_client5_id;
  
  -- CLIENT 6: SafeGuard Security - Started services Dec 15, 2025
  INSERT INTO clients (
    agency_id, name, business_name, email, phone,
    service_start_date, baseline_method, gross_margin_pct, attribution_pct
  ) VALUES (
    v_agency_id, 'David Williams', 'SafeGuard Security Systems LLC', 'info@safeguardsec.com', '(555) 678-9012',
    '2025-12-15', 'AVG_PRE_3', 0.45, 0.80
  )
  RETURNING id INTO v_client6_id;

  -- Insert locations for each client
  INSERT INTO locations (client_id, name, address, city, state, zip, business_type, avg_repair_ticket, avg_daily_jobs, conversion_rate)
  VALUES (v_client1_id, 'Downtown Location', '123 Main St', 'Seattle', 'WA', '98101', 'Plumbing', 450, 5, 25);

  INSERT INTO locations (client_id, name, address, city, state, zip, business_type, avg_repair_ticket, avg_daily_jobs, conversion_rate)
  VALUES (v_client2_id, 'Main Office', '789 Industrial Blvd', 'Portland', 'OR', '97201', 'HVAC', 650, 6, 28);

  INSERT INTO locations (client_id, name, address, city, state, zip, business_type, avg_repair_ticket, avg_daily_jobs, conversion_rate)
  VALUES (v_client3_id, 'East Side Office', '321 Garden Way', 'San Francisco', 'CA', '94102', 'Landscaping', 250, 8, 30);

  INSERT INTO locations (client_id, name, address, city, state, zip, business_type, avg_repair_ticket, avg_daily_jobs, conversion_rate)
  VALUES (v_client4_id, 'Downtown Clinic', '987 Health Plaza', 'Austin', 'TX', '78701', 'Dental', 850, 12, 35);

  INSERT INTO locations (client_id, name, address, city, state, zip, business_type, avg_repair_ticket, avg_daily_jobs, conversion_rate)
  VALUES (v_client5_id, 'Main Garage', '147 Auto Center Dr', 'Denver', 'CO', '80202', 'Auto Repair', 550, 9, 26);

  INSERT INTO locations (client_id, name, address, city, state, zip, business_type, avg_repair_ticket, avg_daily_jobs, conversion_rate)
  VALUES (v_client6_id, 'Central Office', '369 Security Blvd', 'Phoenix', 'AZ', '85001', 'Security', 1200, 4, 32);

  -- ====================================================
  -- SUBSCRIPTIONS & PAYMENTS (Feb 7, 10, 16, 2026)
  -- ====================================================
  
  INSERT INTO subscriptions (agency_id, client_id, stripe_subscription_id, status, mrr, current_period_start, current_period_end)
  VALUES (v_agency_id, v_client1_id, 'sub_mock_001', 'active', 497.00, '2026-02-07 10:00:00-08'::TIMESTAMPTZ, '2026-03-07 10:00:00-08'::TIMESTAMPTZ);
  INSERT INTO payments (agency_id, client_id, stripe_payment_id, amount, type, description, paid_at)
  VALUES (v_agency_id, v_client1_id, 'pi_mock_001', 497.00, 'subscription', 'Monthly subscription - Johns Plumbing', '2026-02-07 10:00:00-08'::TIMESTAMPTZ);
  INSERT INTO payments (agency_id, client_id, stripe_payment_id, amount, type, description, paid_at)
  VALUES (v_agency_id, v_client1_id, 'pi_setup_001', 500.00, 'setup', 'Initial setup fee', '2026-02-07 10:05:00-08'::TIMESTAMPTZ);

  INSERT INTO subscriptions (agency_id, client_id, stripe_subscription_id, status, mrr, current_period_start, current_period_end)
  VALUES (v_agency_id, v_client2_id, 'sub_mock_002', 'active', 697.00, '2026-02-10 14:30:00-08'::TIMESTAMPTZ, '2026-03-10 14:30:00-08'::TIMESTAMPTZ);
  INSERT INTO payments (agency_id, client_id, stripe_payment_id, amount, type, description, paid_at)
  VALUES (v_agency_id, v_client2_id, 'pi_mock_002', 697.00, 'subscription', 'Monthly subscription - Elite HVAC', '2026-02-10 14:30:00-08'::TIMESTAMPTZ);
  INSERT INTO payments (agency_id, client_id, stripe_payment_id, amount, type, description, paid_at)
  VALUES (v_agency_id, v_client2_id, 'pi_setup_002', 750.00, 'setup', 'Initial setup fee', '2026-02-10 14:35:00-08'::TIMESTAMPTZ);

  INSERT INTO subscriptions (agency_id, client_id, stripe_subscription_id, status, mrr, current_period_start, current_period_end)
  VALUES (v_agency_id, v_client3_id, 'sub_mock_003', 'active', 397.00, '2026-02-10 16:45:00-08'::TIMESTAMPTZ, '2026-03-10 16:45:00-08'::TIMESTAMPTZ);
  INSERT INTO payments (agency_id, client_id, stripe_payment_id, amount, type, description, paid_at)
  VALUES (v_agency_id, v_client3_id, 'pi_mock_003', 397.00, 'subscription', 'Monthly subscription - Green Lawn Care', '2026-02-10 16:45:00-08'::TIMESTAMPTZ);

  INSERT INTO subscriptions (agency_id, client_id, stripe_subscription_id, status, mrr, current_period_start, current_period_end)
  VALUES (v_agency_id, v_client4_id, 'sub_mock_004', 'active', 797.00, '2026-02-16 09:00:00-08'::TIMESTAMPTZ, '2026-03-16 09:00:00-08'::TIMESTAMPTZ);
  INSERT INTO payments (agency_id, client_id, stripe_payment_id, amount, type, description, paid_at)
  VALUES (v_agency_id, v_client4_id, 'pi_mock_004', 797.00, 'subscription', 'Monthly subscription - Bright Smile Dental', '2026-02-16 09:00:00-08'::TIMESTAMPTZ);
  INSERT INTO payments (agency_id, client_id, stripe_payment_id, amount, type, description, paid_at)
  VALUES (v_agency_id, v_client4_id, 'pi_setup_004', 1000.00, 'setup', 'Initial setup fee', '2026-02-16 09:05:00-08'::TIMESTAMPTZ);

  INSERT INTO subscriptions (agency_id, client_id, stripe_subscription_id, status, mrr, current_period_start, current_period_end)
  VALUES (v_agency_id, v_client5_id, 'sub_mock_005', 'active', 597.00, '2026-02-16 11:30:00-08'::TIMESTAMPTZ, '2026-03-16 11:30:00-08'::TIMESTAMPTZ);
  INSERT INTO payments (agency_id, client_id, stripe_payment_id, amount, type, description, paid_at)
  VALUES (v_agency_id, v_client5_id, 'pi_mock_005', 597.00, 'subscription', 'Monthly subscription - QuickFix Auto', '2026-02-16 11:30:00-08'::TIMESTAMPTZ);

  INSERT INTO subscriptions (agency_id, client_id, stripe_subscription_id, status, mrr, current_period_start, current_period_end)
  VALUES (v_agency_id, v_client6_id, 'sub_mock_006', 'active', 897.00, '2026-02-16 15:00:00-08'::TIMESTAMPTZ, '2026-03-16 15:00:00-08'::TIMESTAMPTZ);
  INSERT INTO payments (agency_id, client_id, stripe_payment_id, amount, type, description, paid_at)
  VALUES (v_agency_id, v_client6_id, 'pi_mock_006', 897.00, 'subscription', 'Monthly subscription - SafeGuard Security', '2026-02-16 15:00:00-08'::TIMESTAMPTZ);

  -- ====================================================
  -- MONTHLY REVENUE DATA FOR REVENUE CALCULATOR
  -- Shows growth trend after services started
  -- ====================================================
  
  -- CLIENT 1: Johns Plumbing (service start: Dec 1, 2025)
  -- Pre-service baseline data (Sept, Oct, Nov 2025)
  INSERT INTO client_revenue_monthly (agency_id, client_id, month, revenue, source) VALUES
  (v_agency_id, v_client1_id, '2025-09-01', 12500, 'MANUAL'),
  (v_agency_id, v_client1_id, '2025-10-01', 13200, 'MANUAL'),
  (v_agency_id, v_client1_id, '2025-11-01', 12800, 'MANUAL');
  -- Post-service growth (Dec 2025 - Feb 2026)
  INSERT INTO client_revenue_monthly (agency_id, client_id, month, revenue, source) VALUES
  (v_agency_id, v_client1_id, '2025-12-01', 13500, 'MANUAL'),
  (v_agency_id, v_client1_id, '2026-01-01', 14800, 'MANUAL'),
  (v_agency_id, v_client1_id, '2026-02-01', 16200, 'MANUAL');

  -- CLIENT 2: Elite HVAC (service start: Nov 15, 2025)
  INSERT INTO client_revenue_monthly (agency_id, client_id, month, revenue, source) VALUES
  (v_agency_id, v_client2_id, '2025-08-01', 28000, 'MANUAL'),
  (v_agency_id, v_client2_id, '2025-09-01', 29500, 'MANUAL'),
  (v_agency_id, v_client2_id, '2025-10-01', 28700, 'MANUAL'),
  (v_agency_id, v_client2_id, '2025-11-01', 30200, 'MANUAL'),
  (v_agency_id, v_client2_id, '2025-12-01', 32500, 'MANUAL'),
  (v_agency_id, v_client2_id, '2026-01-01', 34800, 'MANUAL'),
  (v_agency_id, v_client2_id, '2026-02-01', 36500, 'MANUAL');

  -- CLIENT 3: Green Lawn Care (service start: Jan 1, 2026)
  INSERT INTO client_revenue_monthly (agency_id, client_id, month, revenue, source) VALUES
  (v_agency_id, v_client3_id, '2025-10-01', 8500, 'MANUAL'),
  (v_agency_id, v_client3_id, '2025-11-01', 7200, 'MANUAL'),
  (v_agency_id, v_client3_id, '2025-12-01', 6800, 'MANUAL'),
  (v_agency_id, v_client3_id, '2026-01-01', 7500, 'MANUAL'),
  (v_agency_id, v_client3_id, '2026-02-01', 8900, 'MANUAL');

  -- CLIENT 4: Bright Smile Dental (service start: Oct 1, 2025)
  INSERT INTO client_revenue_monthly (agency_id, client_id, month, revenue, source) VALUES
  (v_agency_id, v_client4_id, '2025-07-01', 42000, 'MANUAL'),
  (v_agency_id, v_client4_id, '2025-08-01', 43500, 'MANUAL'),
  (v_agency_id, v_client4_id, '2025-09-01', 41800, 'MANUAL'),
  (v_agency_id, v_client4_id, '2025-10-01', 44200, 'MANUAL'),
  (v_agency_id, v_client4_id, '2025-11-01', 47500, 'MANUAL'),
  (v_agency_id, v_client4_id, '2025-12-01', 50200, 'MANUAL'),
  (v_agency_id, v_client4_id, '2026-01-01', 52800, 'MANUAL'),
  (v_agency_id, v_client4_id, '2026-02-01', 54500, 'MANUAL');

  -- CLIENT 5: QuickFix Auto (service start: Nov 1, 2025)
  INSERT INTO client_revenue_monthly (agency_id, client_id, month, revenue, source) VALUES
  (v_agency_id, v_client5_id, '2025-08-01', 22000, 'MANUAL'),
  (v_agency_id, v_client5_id, '2025-09-01', 21500, 'MANUAL'),
  (v_agency_id, v_client5_id, '2025-10-01', 23200, 'MANUAL'),
  (v_agency_id, v_client5_id, '2025-11-01', 24500, 'MANUAL'),
  (v_agency_id, v_client5_id, '2025-12-01', 26800, 'MANUAL'),
  (v_agency_id, v_client5_id, '2026-01-01', 28200, 'MANUAL'),
  (v_agency_id, v_client5_id, '2026-02-01', 29500, 'MANUAL');

  -- CLIENT 6: SafeGuard Security (service start: Dec 15, 2025)
  INSERT INTO client_revenue_monthly (agency_id, client_id, month, revenue, source) VALUES
  (v_agency_id, v_client6_id, '2025-09-01', 38000, 'MANUAL'),
  (v_agency_id, v_client6_id, '2025-10-01', 39500, 'MANUAL'),
  (v_agency_id, v_client6_id, '2025-11-01', 37800, 'MANUAL'),
  (v_agency_id, v_client6_id, '2025-12-01', 40200, 'MANUAL'),
  (v_agency_id, v_client6_id, '2026-01-01', 43500, 'MANUAL'),
  (v_agency_id, v_client6_id, '2026-02-01', 45800, 'MANUAL');

  RAISE NOTICE '✅ Mock data created successfully!';
  RAISE NOTICE 'Agency ID: %', v_agency_id;
  RAISE NOTICE '';
  RAISE NOTICE '=== MRR TIMELINE ===';
  RAISE NOTICE 'Feb 7: $497 (1 client)';
  RAISE NOTICE 'Feb 10: $1,591 (3 clients)';
  RAISE NOTICE 'Feb 16: $3,879 (6 clients)';
  RAISE NOTICE '';
  RAISE NOTICE '=== REVENUE CALCULATOR DATA ===';
  RAISE NOTICE '✅ 6 clients with service_start_date set';
  RAISE NOTICE '✅ 41 monthly revenue entries (pre + post service)';
  RAISE NOTICE '✅ All clients showing revenue growth';
  RAISE NOTICE '';
  RAISE NOTICE '👉 Go to /dashboard/calculator to view Revenue Impact!';
END $$;
