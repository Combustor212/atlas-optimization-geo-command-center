-- Add follow-up status for call requests (scheduled_call leads)
-- Allows admins to track: pending, need to follow up, contacted, scheduled, followed up, no answer

ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_status TEXT
  CHECK (follow_up_status IS NULL OR follow_up_status IN (
    'pending',
    'need_to_follow_up',
    'contacted',
    'scheduled',
    'followed_up',
    'no_answer'
  ));

-- Default new call requests to pending
COMMENT ON COLUMN leads.follow_up_status IS 'Follow-up status for call requests: pending, need_to_follow_up, contacted, scheduled, followed_up, no_answer';

-- Agency members can update leads (for status changes)
CREATE POLICY "Agency members update leads"
  ON leads FOR UPDATE
  USING (agency_id = get_user_agency_id() AND is_agency_member())
  WITH CHECK (agency_id = get_user_agency_id());
