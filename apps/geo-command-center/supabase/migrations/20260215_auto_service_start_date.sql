-- Auto-set service_start_date when subscription is created
-- This trigger automatically populates the service start date for revenue calculator

-- Function to set service_start_date from subscription
CREATE OR REPLACE FUNCTION auto_set_service_start_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set if client doesn't have a service_start_date yet
  -- and the subscription is active
  IF NEW.status = 'active' THEN
    UPDATE clients 
    SET service_start_date = DATE(NEW.current_period_start)
    WHERE id = NEW.client_id 
      AND service_start_date IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger that fires after a subscription is inserted
DROP TRIGGER IF EXISTS subscription_sets_service_date ON subscriptions;
CREATE TRIGGER subscription_sets_service_date
  AFTER INSERT ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_service_start_date();

-- Also handle updates (if subscription becomes active)
DROP TRIGGER IF EXISTS subscription_update_sets_service_date ON subscriptions;
CREATE TRIGGER subscription_update_sets_service_date
  AFTER UPDATE ON subscriptions
  FOR EACH ROW
  WHEN (NEW.status = 'active' AND OLD.status != 'active')
  EXECUTE FUNCTION auto_set_service_start_date();

COMMENT ON FUNCTION auto_set_service_start_date IS 'Automatically sets client service_start_date from first active subscription';
