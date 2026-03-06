-- Add preferred_date for fallback Book a Call form (date picker)
-- scheduled_at = full datetime from calendar; preferred_date + preferred_time = from fallback form
ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferred_date DATE;
