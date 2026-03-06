-- Mock Data with Specific Payment Timeline (NO DELETE VERSION)
-- MRR starts at $0, then:
-- - First payment (1 client) on Feb 7, 2026
-- - 2 more payments (2 clients) on Feb 10, 2026  
-- - Remaining payments on Feb 16, 2026

-- This version does NOT delete existing data - it only adds new data

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

  -- Insert 6 Mock Clients (with different emails to avoid conflicts)
  INSERT INTO clients (agency_id, name, business_name, email, phone) VALUES
  (v_agency_id, 'John Smith', 'Johns Plumbing Services LLC', 'john.smith.feb@johnsplumbing.com', '(555) 123-4567')
  RETURNING id INTO v_client1_id;
  
  INSERT INTO clients (agency_id, name, business_name, email, phone) VALUES
  (v_agency_id, 'Sarah Johnson', 'Elite HVAC Solutions Inc', 'sarah.feb@elitehvac.com', '(555) 234-5678')
  RETURNING id INTO v_client2_id;
  
  INSERT INTO clients (agency_id, name, business_name, email, phone) VALUES
  (v_agency_id, 'Mike Green', 'Green Lawn Care Professional Services', 'mike.feb@greenlawnpro.com', '(555) 345-6789')
  RETURNING id INTO v_client3_id;
  
  INSERT INTO clients (agency_id, name, business_name, email, phone) VALUES
  (v_agency_id, 'Dr. Lisa Chen', 'Bright Smile Dental Care', 'lisa.feb@brightsmile.com', '(555) 456-7890')
  RETURNING id INTO v_client4_id;
  
  INSERT INTO clients (agency_id, name, business_name, email, phone) VALUES
  (v_agency_id, 'Tom Rodriguez', 'QuickFix Auto Repair & Service', 'tom.feb@quickfixauto.com', '(555) 567-8901')
  RETURNING id INTO v_client5_id;
  
  INSERT INTO clients (agency_id, name, business_name, email, phone) VALUES
  (v_agency_id, 'David Williams', 'SafeGuard Security Systems LLC', 'david.feb@safeguardsec.com', '(555) 678-9012')
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
  -- SUBSCRIPTIONS & PAYMENTS - SPECIFIC TIMELINE
  -- ====================================================
  
  -- CLIENT 1: First payment on Feb 7, 2026 - $497/month MRR
  INSERT INTO subscriptions (
    agency_id, client_id, stripe_subscription_id, status, mrr, 
    current_period_start, current_period_end
  ) VALUES (
    v_agency_id, v_client1_id, 'sub_feb_001', 'active', 497.00,
    '2026-02-07 10:00:00-08'::TIMESTAMPTZ,
    '2026-03-07 10:00:00-08'::TIMESTAMPTZ
  );

  INSERT INTO payments (agency_id, client_id, stripe_payment_id, amount, type, description, paid_at)
  VALUES (v_agency_id, v_client1_id, 'pi_feb_001', 497.00, 'subscription', 'Monthly subscription - Johns Plumbing', '2026-02-07 10:00:00-08'::TIMESTAMPTZ);

  -- CLIENT 2: Second payment on Feb 10, 2026 - $697/month MRR
  INSERT INTO subscriptions (
    agency_id, client_id, stripe_subscription_id, status, mrr,
    current_period_start, current_period_end
  ) VALUES (
    v_agency_id, v_client2_id, 'sub_feb_002', 'active', 697.00,
    '2026-02-10 14:30:00-08'::TIMESTAMPTZ,
    '2026-03-10 14:30:00-08'::TIMESTAMPTZ
  );

  INSERT INTO payments (agency_id, client_id, stripe_payment_id, amount, type, description, paid_at)
  VALUES (v_agency_id, v_client2_id, 'pi_feb_002', 697.00, 'subscription', 'Monthly subscription - Elite HVAC', '2026-02-10 14:30:00-08'::TIMESTAMPTZ);

  -- CLIENT 3: Third payment on Feb 10, 2026 - $397/month MRR
  INSERT INTO subscriptions (
    agency_id, client_id, stripe_subscription_id, status, mrr,
    current_period_start, current_period_end
  ) VALUES (
    v_agency_id, v_client3_id, 'sub_feb_003', 'active', 397.00,
    '2026-02-10 16:45:00-08'::TIMESTAMPTZ,
    '2026-03-10 16:45:00-08'::TIMESTAMPTZ
  );

  INSERT INTO payments (agency_id, client_id, stripe_payment_id, amount, type, description, paid_at)
  VALUES (v_agency_id, v_client3_id, 'pi_feb_003', 397.00, 'subscription', 'Monthly subscription - Green Lawn Care', '2026-02-10 16:45:00-08'::TIMESTAMPTZ);

  -- CLIENT 4: Fourth payment on Feb 16, 2026 - $797/month MRR
  INSERT INTO subscriptions (
    agency_id, client_id, stripe_subscription_id, status, mrr,
    current_period_start, current_period_end
  ) VALUES (
    v_agency_id, v_client4_id, 'sub_feb_004', 'active', 797.00,
    '2026-02-16 09:00:00-08'::TIMESTAMPTZ,
    '2026-03-16 09:00:00-08'::TIMESTAMPTZ
  );

  INSERT INTO payments (agency_id, client_id, stripe_payment_id, amount, type, description, paid_at)
  VALUES (v_agency_id, v_client4_id, 'pi_feb_004', 797.00, 'subscription', 'Monthly subscription - Bright Smile Dental', '2026-02-16 09:00:00-08'::TIMESTAMPTZ);

  -- CLIENT 5: Fifth payment on Feb 16, 2026 - $597/month MRR
  INSERT INTO subscriptions (
    agency_id, client_id, stripe_subscription_id, status, mrr,
    current_period_start, current_period_end
  ) VALUES (
    v_agency_id, v_client5_id, 'sub_feb_005', 'active', 597.00,
    '2026-02-16 11:30:00-08'::TIMESTAMPTZ,
    '2026-03-16 11:30:00-08'::TIMESTAMPTZ
  );

  INSERT INTO payments (agency_id, client_id, stripe_payment_id, amount, type, description, paid_at)
  VALUES (v_agency_id, v_client5_id, 'pi_feb_005', 597.00, 'subscription', 'Monthly subscription - QuickFix Auto', '2026-02-16 11:30:00-08'::TIMESTAMPTZ);

  -- CLIENT 6: Sixth payment on Feb 16, 2026 - $897/month MRR
  INSERT INTO subscriptions (
    agency_id, client_id, stripe_subscription_id, status, mrr,
    current_period_start, current_period_end
  ) VALUES (
    v_agency_id, v_client6_id, 'sub_feb_006', 'active', 897.00,
    '2026-02-16 15:00:00-08'::TIMESTAMPTZ,
    '2026-03-16 15:00:00-08'::TIMESTAMPTZ
  );

  INSERT INTO payments (agency_id, client_id, stripe_payment_id, amount, type, description, paid_at)
  VALUES (v_agency_id, v_client6_id, 'pi_feb_006', 897.00, 'subscription', 'Monthly subscription - SafeGuard Security', '2026-02-16 15:00:00-08'::TIMESTAMPTZ);

  -- Add some setup fees on the same dates
  INSERT INTO payments (agency_id, client_id, stripe_payment_id, amount, type, description, paid_at)
  VALUES (v_agency_id, v_client1_id, 'pi_setup_feb_001', 500.00, 'setup', 'Initial setup fee', '2026-02-07 10:05:00-08'::TIMESTAMPTZ);

  INSERT INTO payments (agency_id, client_id, stripe_payment_id, amount, type, description, paid_at)
  VALUES (v_agency_id, v_client2_id, 'pi_setup_feb_002', 750.00, 'setup', 'Initial setup fee', '2026-02-10 14:35:00-08'::TIMESTAMPTZ);

  INSERT INTO payments (agency_id, client_id, stripe_payment_id, amount, type, description, paid_at)
  VALUES (v_agency_id, v_client4_id, 'pi_setup_feb_004', 1000.00, 'setup', 'Initial setup fee', '2026-02-16 09:05:00-08'::TIMESTAMPTZ);

  RAISE NOTICE 'Mock data created successfully!';
  RAISE NOTICE 'Agency ID: %', v_agency_id;
  RAISE NOTICE 'Total MRR: $3,879 (accumulated by Feb 16)';
  RAISE NOTICE 'Payment Timeline:';
  RAISE NOTICE '  - Feb 7: $497 MRR (1 client)';
  RAISE NOTICE '  - Feb 10: $1,591 total MRR (3 clients)';
  RAISE NOTICE '  - Feb 16: $3,879 total MRR (6 clients)';
END $$;
