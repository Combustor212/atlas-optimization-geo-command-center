-- Add scheduled_at and meet_link for Book a Call Google Meet integration
ALTER TABLE leads ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS meet_link TEXT;
