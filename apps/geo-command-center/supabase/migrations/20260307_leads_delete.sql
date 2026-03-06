-- Agency members can delete leads (admin/staff)
CREATE POLICY "Agency members delete leads"
  ON leads FOR DELETE
  USING (agency_id = get_user_agency_id() AND is_agency_member());
